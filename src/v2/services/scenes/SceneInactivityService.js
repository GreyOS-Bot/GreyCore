const manager = require("../../managers/SceneAssistantV2Manager");
const sceneAssistantService = require("./SceneAssistantService");
const logger = require("../../core/services/TechnicalLogger")
    .create("SceneInactivity");
const threadAccessService = require(
    "../../core/services/DiscordThreadAccessService"
);
const referenceResolver = require(
    "../../core/services/DiscordReferenceResolverService"
);

class SceneInactivityService {
    constructor() {
        this.client = null;
        this.startupTimer = null;
        this.intervalTimer = null;
        this.running = false;
    }

    start(client) {
        this.client = client;
        if (
            this.startupTimer
            || this.intervalTimer
        ) {
            return;
        }

        this.intervalTimer = setInterval(
            () => this.runOnceSafely(),
            5 * 60 * 1000
        );
        this.intervalTimer.unref?.();

        this.startupTimer = setTimeout(
            () => {
                this.startupTimer = null;
                return this.runOnceSafely();
            },
            10_000
        );
        this.startupTimer.unref?.();
    }

    stop() {
        if (this.startupTimer) {
            clearTimeout(
                this.startupTimer
            );
            this.startupTimer = null;
        }

        if (this.intervalTimer) {
            clearInterval(
                this.intervalTimer
            );
            this.intervalTimer = null;
        }
    }

    async runOnceSafely() {
        if (this.running) {
            return [];
        }

        this.running = true;

        try {
            return await this.check();
        } catch (error) {
            logger.error(
                "Vérification impossible :",
                String(
                    error?.message
                    || "Erreur inconnue"
                )
            );
            return [];
        } finally {
            this.running = false;
        }
    }

    isCurrentSnapshot(scene) {
        const current = manager.getScene(scene.id, { guildId: scene.guild_id, contextId: scene.context_id, write: true });
        return current && ['active', 'conclude'].includes(current.status)
            && String(current.channel_ids || '').split(',').includes(scene.channel_id)
            && current.last_rp_message_at === scene.last_rp_message_at;
    }

    async check(now = new Date()) {
        if (!this.client) {
            return [];
        }

        const prompted = [];
        for (const scene of manager.getInactiveScenes(now)) {
            try {
                const reference = {
                    domain: "scene",
                    ownerKey: `scene:${scene.id}`,
                    resourceKind: "channel",
                    discordId: scene.channel_id,
                    guildId: scene.guild_id
                };
                const resolution = await referenceResolver.resolve(
                    reference,
                    { client: this.client },
                    { now }
                );
                if (!resolution.available) continue;
                const channel = resolution.channel;

                if (!channel?.isTextBased?.()) {
                    continue;
                }

                if (!this.isCurrentSnapshot(scene)) continue;

                const access =
                    await threadAccessService.ensureWritable(
                        channel
                    );

                if (!access.ready) {
                    referenceResolver.recordFailure(
                        reference,
                        access.error || access,
                        now
                    );
                    logger.warn(
                        "Prompt d’inactivité impossible :",
                        threadAccessService.errorFor(
                            access,
                            "scene_inactivity"
                        )
                    );
                    continue;
                }

                const writableChannel =
                    access.channel || channel;

                // Revalidate after Discord awaits: a disabled Context cannot produce a new prompt.
                if (!this.isCurrentSnapshot(scene)) continue;

                const message = await writableChannel.send(
                    sceneAssistantService.buildClosurePrompt(
                        scene,
                        scene.inactivity_hours
                    )
                );

                if (!this.isCurrentSnapshot(scene)) continue;
                manager.saveClosurePrompt({
                    sceneId: scene.id,
                    guildId: scene.guild_id,
                    contextId: scene.context_id,
                    channelId: scene.channel_id,
                    messageId: message.id
                });
                prompted.push(scene.id);
            } catch (error) {
                logger.error(
                    "Traitement d’une scène inactive impossible :",
                    String(
                        error?.message
                        || "Erreur inconnue"
                    )
                );
            }
        }

        return prompted;
    }
}

module.exports = new SceneInactivityService();
