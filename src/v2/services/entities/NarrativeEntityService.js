const { EmbedBuilder } = require("discord.js");
const manager = require("../../managers/NarrativeEntityV2Manager");
const webhookManager = require("../../../webhooks/webhookManager");

class NarrativeEntityService {
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
        const webhook = await webhookManager.getOrCreateWebhook(channel);
        return webhook.send({
            username: entity.name,
            avatarURL: entity.avatar_url || undefined,
            embeds: [new EmbedBuilder().setColor(entity.embed_color).setDescription(
                [rendered, suffix].filter(Boolean).join("\n\n")
            )],
            allowedMentions: { parse: [] }
        });
    }
}

module.exports = new NarrativeEntityService();
