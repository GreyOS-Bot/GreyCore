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
        this.timer = null;
    }

    start(client) {
        this.client = client;
        if (this.timer) {
            return;
        }

        this.timer = setInterval(
            () => this.check().catch(error =>
                logger.error("Vérification impossible :", error)
            ),
            5 * 60 * 1000
        );
        this.timer.unref?.();

        setTimeout(
            () => this.check().catch(() => null),
            10_000
        ).unref?.();
    }

    async check(now = new Date()) {
        if (!this.client) {
            return [];
        }

        const prompted = [];
        for (const scene of manager.getInactiveScenes(now)) {
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

            const message = await writableChannel.send(
                sceneAssistantService.buildClosurePrompt(
                    scene,
                    scene.inactivity_hours
                )
            );

            manager.saveClosurePrompt({
                sceneId: scene.id,
                guildId: scene.guild_id,
                channelId: scene.channel_id,
                messageId: message.id
            });
            prompted.push(scene.id);
        }

        return prompted;
    }
}

module.exports = new SceneInactivityService();
