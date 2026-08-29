const { ChannelType } = require("discord.js");
const eventManager = require("../../managers/NarrativeEntityEventManager");
const eventRepository = require("../../repositories/NarrativeEntityEventRepository");
const entityService = require("./NarrativeEntityService");
const { matchSchedule } = require("./NarrativeEventSchedule");
const logger = require("../../core/services/TechnicalLogger").create("NarrativeEntityEventScheduler");
const referenceResolver = require("../../core/services/DiscordReferenceResolverService");

const STALE_RUN_LEASE_MS = 5 * 60 * 1000;

class NarrativeEntityEventScheduler {
    constructor() { this.timer = null; this.running = false; }

    start(client) {
        this.stop();
        this.client = client;
        this.timer = setInterval(() => this.tick().catch(error => logger.error("Vérification impossible :", error)), 60_000);
        this.timer.unref?.();
        this.tick().catch(error => logger.error("Vérification initiale impossible :", error));
    }

    stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

    async tick(now = new Date()) {
        if (this.running || !this.client) return;
        this.running = true;
        try {
            await this.recoverStaleRuns(now);
            for (const event of eventManager.getEnabled()) {
                const runKey = matchSchedule({
                    calendarRule: event.calendar_rule,
                    weekdayRule: event.weekday_rule,
                    timeRule: event.time_rule,
                    timezone: event.timezone
                }, now);
                if (!runKey) continue;
                const guild = this.client.guilds.cache.get(event.guild_id);
                if (!guild) continue;
                for (const channel of await this.resolveChannels(guild, event.scopes, event, now)) {
                    const attemptToken = eventRepository.claimRun(
                        event.id, runKey, channel.id, now.toISOString()
                    );
                    if (!attemptToken) continue;
                    await this.executeRun(event, runKey, channel, attemptToken);
                }
            }
        } finally { this.running = false; }
    }

    async recoverStaleRuns(now) {
        const staleBefore = new Date(now.getTime() - STALE_RUN_LEASE_MS).toISOString();
        for (const run of eventRepository.getStaleRunningRuns(staleBefore)) {
            if (run.external_effect_attempted !== 0 || !run.attempt_token) {
                eventRepository.markStaleRunUncertain(run.id, staleBefore, now.toISOString());
                continue;
            }

            const attemptToken = eventRepository.recoverRun(
                run.id, run.attempt_token, staleBefore, now.toISOString()
            );
            if (!attemptToken) continue;

            const event = run.guild_id
                ? eventRepository.getById(run.guild_id, run.event_id)
                : null;
            if (!event || !event.is_enabled || !event.entity_enabled) {
                eventRepository.failRun(
                    run.event_id, run.run_key, run.channel_id, attemptToken,
                    "Événement supprimé ou désactivé avant récupération.", now.toISOString()
                );
                continue;
            }

            const guild = this.client.guilds.cache.get(event.guild_id);
            if (!guild) {
                eventRepository.failRun(
                    run.event_id, run.run_key, run.channel_id, attemptToken,
                    "Serveur indisponible avant récupération.", now.toISOString()
                );
                continue;
            }

            const channels = await this.resolveChannels(guild, event.scopes, event, now);
            const channel = channels.find(candidate => candidate.id === run.channel_id);
            if (!channel) {
                eventRepository.failRun(
                    run.event_id, run.run_key, run.channel_id, attemptToken,
                    "Destination supprimée, détachée ou indisponible avant récupération.", now.toISOString()
                );
                continue;
            }
            await this.executeRun(event, run.run_key, channel, attemptToken);
        }
    }

    async executeRun(event, runKey, channel, attemptToken) {
        let externalEffectAttempted = false;
        try {
            const sent = await entityService.sendEntity({
                channel,
                entityId: event.entity_id,
                content: event.message_content,
                threadName: channel.type === ChannelType.GuildForum ? event.name : null,
                onBeforeSendAttempt: () => {
                    const owned = eventRepository.markExternalEffectAttempted(
                        event.id, runKey, channel.id, attemptToken, new Date().toISOString()
                    );
                    if (!owned) {
                        throw new Error("La tentative d’envoi ne possède plus son run.");
                    }
                    externalEffectAttempted = true;
                }
            });
            if (!sent?.id) {
                throw new Error("Aucun message narratif n’a été créé.");
            }
            eventRepository.completeRun(
                event.id, runKey, channel.id, attemptToken, sent.id, new Date().toISOString()
            );
        } catch (error) {
            eventRepository.failRun(
                event.id, runKey, channel.id, attemptToken,
                error?.message || error, new Date().toISOString(), externalEffectAttempted
            );
            logger.error(`Échec de « ${event.name} » dans ${channel.id} :`, error);
        }
    }

    async resolveChannels(guild, scopeIds, event = {}, now = new Date()) {
        const resolved = new Map();
        for (const id of scopeIds || []) {
            const cached = guild.channels.cache.get(id) || null;
            const reference = {
                domain: "narrative_entity",
                ownerKey: `scope:${event.id || "unknown"}:${id}`,
                resourceKind: "channel",
                discordId: id,
                guildId: event.guild_id || guild.id
            };
            const resolution = await referenceResolver.resolve(
                reference,
                { guild },
                cached ? { channel: cached, now } : { now }
            );
            if (!resolution.available) continue;
            const scope = resolution.channel;
            if (scope.type === ChannelType.GuildCategory) {
                for (const channel of guild.channels.cache.values()) {
                    if (channel.parentId === scope.id && channel.isTextBased?.() && channel.type !== ChannelType.GuildForum) {
                        resolved.set(channel.id, channel);
                    }
                }
            } else if (scope.isTextBased?.() || scope.type === ChannelType.GuildForum) {
                resolved.set(scope.id, scope);
            }
        }
        return [...resolved.values()];
    }
}

module.exports = new NarrativeEntityEventScheduler();
module.exports.STALE_RUN_LEASE_MS = STALE_RUN_LEASE_MS;
