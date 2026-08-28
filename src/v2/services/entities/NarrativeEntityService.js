const { EmbedBuilder } = require("discord.js");
const manager = require("../../managers/NarrativeEntityV2Manager");
const webhookManager = require("../../../webhooks/webhookManager");

class NarrativeEntityService {
    constructor() {
        this.invocationCooldowns = new Map();
        this.invocationCooldownMs = 15_000;
    }

    resolve(guildId, triggerKey, channel = null) {
        return manager.chooseForTrigger(guildId, triggerKey, {
            channelId: channel?.id,
            parentId: channel?.parentId
        });
    }

    async send({ channel, triggerKey, content = null, suffix = null, variables = {} }) {
        const selection = this.resolve(channel.guildId, triggerKey, channel);
        if (!selection) return null;
        const { entity, message } = selection;
        const rendered = Object.entries(variables).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
            String(content || message.content)
        );
        const sent = await webhookManager.sendWithWebhook(channel, {
            username: entity.name,
            avatarURL: entity.avatar_url || undefined,
            embeds: [new EmbedBuilder().setColor(entity.embed_color).setDescription(
                [rendered, suffix].filter(Boolean).join("\n\n")
            )],
            allowedMentions: { parse: [] }
        });
        return sent.webhookMessage;
    }

    async sendEntity({ channel, entityId, content = null, suffix = null, variables = {}, threadName = null }) {
        const entity = manager.getById(channel.guildId, entityId);
        if (!entity || !entity.is_enabled) return null;
        const messages = entity.messages.filter(message => Number(message.is_enabled) === 1);
        const fallback = messages[Math.floor(Math.random() * messages.length)];
        const source = String(content || fallback?.content || "").trim();
        if (!source) return null;
        const rendered = Object.entries(variables).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), source
        );
        const payload = {
            username: entity.name,
            avatarURL: entity.avatar_url || undefined,
            embeds: [new EmbedBuilder().setColor(entity.embed_color).setDescription(
                [rendered, suffix].filter(Boolean).join("\n\n")
            )],
            allowedMentions: { parse: [] }
        };
        if (threadName) payload.threadName = threadName.slice(0, 100);
        const sent = await webhookManager.sendWithWebhook(channel, payload);
        return sent.webhookMessage;
    }

    async processInvocation(message) {
        if (
            !message?.guildId
            || message.author?.bot
            || message.webhookId
        ) return false;

        const selection = manager.chooseForInvocation(
            message.guildId,
            message.content,
            {
                channelId: message.channelId,
                parentId: message.channel?.parentId
            }
        );
        if (!selection) return false;

        const cooldownKey = `${message.guildId}:${message.channelId}:${selection.entity.id}`;
        const now = Date.now();
        const availableAt = this.invocationCooldowns.get(cooldownKey) || 0;
        if (availableAt > now) return false;
        this.invocationCooldowns.set(cooldownKey, now + this.invocationCooldownMs);
        this.pruneCooldowns(now);

        await this.sendSelection(message.channel, selection);
        return true;
    }

    async processMessage(message) {
        if (await this.processScopedWelcome(message)) return true;
        return this.processInvocation(message);
    }

    async processScopedWelcome(message) {
        if (
            !message?.guildId
            || message.author?.bot
            || message.webhookId
            || !message.channelId
        ) return false;

        const selection = manager.claimScopedWelcome(
            message.guildId,
            message.channelId,
            message.channel?.parentId || null
        );
        if (!selection) return false;

        try {
            await this.sendSelection(message.channel, selection);
            return true;
        } catch (error) {
            manager.releaseForumWelcome(selection.entity.id, message.channelId);
            throw error;
        }
    }

    async sendSelection(channel, selection) {
        const sent = await webhookManager.sendWithWebhook(channel, {
            username: selection.entity.name,
            avatarURL: selection.entity.avatar_url || undefined,
            embeds: [new EmbedBuilder()
                .setColor(selection.entity.embed_color)
                .setDescription(selection.message.content)],
            allowedMentions: { parse: [] }
        });
        return sent.webhookMessage;
    }

    pruneCooldowns(now) {
        if (this.invocationCooldowns.size < 500) return;
        for (const [key, availableAt] of this.invocationCooldowns) {
            if (availableAt <= now) this.invocationCooldowns.delete(key);
        }
    }
}

module.exports = new NarrativeEntityService();
