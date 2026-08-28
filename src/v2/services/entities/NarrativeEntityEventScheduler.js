const { ChannelType } = require("discord.js");
const eventManager = require("../../managers/NarrativeEntityEventManager");
const eventRepository = require("../../repositories/NarrativeEntityEventRepository");
const entityService = require("./NarrativeEntityService");
const { matchSchedule } = require("./NarrativeEventSchedule");
const logger = require("../../core/services/TechnicalLogger").create("NarrativeEntityEventScheduler");
const referenceResolver = require("../../core/services/DiscordReferenceResolverService");

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
                    const claimed = eventRepository.claimRun(event.id, runKey, channel.id, now.toISOString());
                    if (!claimed) continue;
                    try {
                        const sent = await entityService.sendEntity({
                            channel, entityId: event.entity_id, content: event.message_content,
                            threadName: channel.type === ChannelType.GuildForum ? event.name : null
                        });
                        eventRepository.completeRun(event.id, runKey, channel.id, sent?.id, new Date().toISOString());
                    } catch (error) {
                        eventRepository.failRun(event.id, runKey, channel.id, error?.message || error, new Date().toISOString());
                        logger.error(`Échec de « ${event.name} » dans ${channel.id} :`, error);
                    }
                }
            }
        } finally { this.running = false; }
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
