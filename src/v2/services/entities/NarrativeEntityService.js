const { EmbedBuilder } = require("discord.js");
const manager = require("../../managers/NarrativeEntityV2Manager");
const instances = require("../../managers/NarrativeEntityInstanceV2Manager");
const webhookManager = require("../../../webhooks/webhookManager");

class NarrativeEntityService {
    constructor() {
        this.invocationCooldowns = new Map();
        this.invocationCooldownMs = 15_000;
    }

    resolve(guildId, triggerKey, channel = null) {
        const contextId=this.contextForChannel(guildId,channel);if(!contextId)return null;
        const candidates=instances.enabled(guildId,contextId).filter(i=>i.triggers.includes(triggerKey)&&[channel?.id,channel?.parentId].filter(Boolean).some(id=>i.scopes.includes(String(id))));
        if(!candidates.length)return null;const entity=candidates[Math.floor(Math.random()*candidates.length)];const messages=entity.messages.filter(m=>Number(m.is_enabled)===1&&(m.trigger_key===triggerKey||m.trigger_key===null));if(!messages.length)return null;return {entity,message:messages[Math.floor(Math.random()*messages.length)]};
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

    async sendEntity({
        channel,
        entityId,
        instanceId = null,
        contextId = null,
        content = null,
        suffix = null,
        variables = {},
        threadName = null,
        onBeforeSendAttempt = null
    }) {
        const entity = instanceId
            ? instances.requireDestination(channel.guildId,contextId,instanceId,channel.id,channel.parentId)
            : manager.getById(channel.guildId, entityId);
        if(instanceId && String(entity.entity_definition_id)!==String(entityId)) throw new Error("L’Entity ne correspond pas à cette instance Context.");
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
        const sent = await webhookManager.sendWithWebhook(channel, payload, {
            onBeforeSendAttempt
        });
        return sent.webhookMessage;
    }

    async processInvocation(message) {
        if (
            !message?.guildId
            || message.author?.bot
            || message.webhookId
        ) return false;

        const contextId=this.contextForChannel(message.guildId,message.channel);if(!contextId)return false;
        const normalized=normalize(message.content),words=new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));
        const candidates=instances.enabled(message.guildId,contextId).filter(i=>[message.channelId,message.channel?.parentId].filter(Boolean).some(id=>i.scopes.includes(String(id)))).filter(i=>[i.name,...i.expressions.map(x=>x.expression)].map(normalize).some(call=>call.includes(' ')?normalized.includes(call):words.has(call)));
        const entity=candidates[Math.floor(Math.random()*candidates.length)];const messages=entity?.messages.filter(m=>Number(m.is_enabled)===1)||[];const selection=entity&&messages.length?{entity,message:messages[Math.floor(Math.random()*messages.length)]}:null;
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

        const contextId=this.contextForChannel(message.guildId,message.channel);if(!contextId)return false;
        const entity=instances.enabled(message.guildId,contextId).find(i=>[message.channelId,message.channel?.parentId].filter(Boolean).some(id=>i.scopes.includes(String(id))));
        const messages=entity?.messages.filter(m=>Number(m.is_enabled)===1)||[];
        const claimed=entity&&messages.length?instances.claimWelcome(message.guildId,contextId,entity.id,message.channelId):false;
        const selection=claimed?{entity,message:messages[Math.floor(Math.random()*messages.length)]}:null;
        if (!selection) return false;

        try {
            await this.sendSelection(message.channel, selection);
            return true;
        } catch (error) {
            instances.releaseWelcome(message.guildId,contextId,selection.entity.id,message.channelId);
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
    contextForChannel(guildId,channel){try{return require("../../managers/SceneAssistantV2Manager").getActiveSceneByChannel(guildId,channel?.id)?.context_id||null;}catch{return null;}}
}

module.exports = new NarrativeEntityService();
function normalize(value){return String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('fr-FR').replace(/\s+/g,' ').trim();}
