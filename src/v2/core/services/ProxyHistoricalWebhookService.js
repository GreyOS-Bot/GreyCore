const webhookManager = require("../../../webhooks/webhookManager");
const threadAccessService = require("./DiscordThreadAccessService");
const channelDiagnosticService = require("./DiscordChannelDiagnosticService");
const { getThreadId, withThreadId } = require("./ProxyThreadContext");

class ProxyHistoricalWebhookService {
    async edit({
        client,
        guild = null,
        channelId = null,
        currentChannel = null,
        channel = null,
        webhookId,
        webhookMessageId,
        payload
    }) {
        const prepared = await this.resolveHistoricalChannel({
            client,
            guild,
            channelId: channelId || channel?.id || null,
            currentChannel: currentChannel || channel || null
        });
        if (!prepared.ready) return prepared;

        const fetched = await this.fetchWebhook(client, webhookId);
        if (!fetched.success) return fetched;

        try {
            await fetched.webhook.editMessage(
                webhookMessageId,
                withThreadId(prepared.channel, payload)
            );
            return this.success();
        } catch (error) {
            return this.failure(error);
        }
    }

    async delete({
        client,
        guild = null,
        channelId = null,
        currentChannel = null,
        channel = null,
        webhookId,
        webhookMessageId
    }) {
        const prepared = await this.resolveHistoricalChannel({
            client,
            guild,
            channelId: channelId || channel?.id || null,
            currentChannel: currentChannel || channel || null
        });
        if (!prepared.ready) return prepared;

        const fetched = await this.fetchWebhook(client, webhookId);
        if (!fetched.success) return fetched;

        try {
            await fetched.webhook.deleteMessage(
                webhookMessageId,
                getThreadId(prepared.channel) || undefined
            );
            return this.success();
        } catch (error) {
            return this.failure(error);
        }
    }

    async resolveHistoricalChannel({
        client,
        guild = null,
        channelId,
        currentChannel = null
    }) {
        if (!channelId) {
            return this.unavailable("unknown_channel", null);
        }

        let channel =
            String(currentChannel?.id || "") === String(channelId)
                ? currentChannel
                : guild?.channels?.cache?.get?.(channelId)
                || client?.channels?.cache?.get?.(channelId)
                || null;

        if (!channel) {
            const diagnostic =
                await channelDiagnosticService.resolveChannel(
                    channelId,
                    {
                        channels:
                            guild?.channels
                            || client?.channels,
                        guild,
                        client
                    }
                );

            if (!diagnostic.found) {
                return this.unavailable(
                    diagnostic.status,
                    diagnostic.error?.discordCode ?? null
                );
            }

            channel = diagnostic.channel;
        }

        return this.ensureChannelAccess(channel);
    }

    async ensureChannelAccess(channel) {
        if (!channel) {
            return this.unavailable("missing_access", null);
        }

        const access = await threadAccessService.ensureWritable(channel);
        if (!access.ready) {
            const statuses = new Set([
                "unknown_channel",
                "missing_access",
                "missing_permissions",
                "locked"
            ]);
            return this.unavailable(
                statuses.has(access.status)
                    ? access.status
                    : "discord_error",
                access.error?.discordCode ?? null
            );
        }

        return {
            success: true,
            ready: true,
            status: "success",
            channel: access.channel || channel
        };
    }

    async fetchWebhook(client, webhookId) {
        if (!webhookId || typeof client?.fetchWebhook !== "function") {
            return this.failedResult("webhook_missing", null);
        }

        try {
            return {
                success: true,
                status: "success",
                webhook: await client.fetchWebhook(webhookId)
            };
        } catch (error) {
            return this.failure(error);
        }
    }

    failure(error) {
        const code = Number(error?.code);
        if (code === 10008) {
            return this.failedResult("message_missing", code);
        }

        const diagnostic = webhookManager.classifyWebhookError(error);
        const statuses = {
            UNKNOWN_WEBHOOK: "webhook_missing",
            MISSING_ACCESS: "missing_access",
            MISSING_PERMISSIONS: "missing_permissions"
        };

        return this.failedResult(
            statuses[diagnostic.kind] || "discord_error",
            diagnostic.discordCode
        );
    }

    unavailable(status, discordCode) {
        return {
            ...this.failedResult(status, discordCode),
            ready: false
        };
    }

    failedResult(status, discordCode) {
        return {
            success: false,
            ready: true,
            status,
            discordCode: discordCode ?? null
        };
    }

    success() {
        return {
            success: true,
            ready: true,
            status: "success",
            discordCode: null
        };
    }

    userMessage(result, action) {
        const messages = {
            edit: {
                message_missing: "Ce message Proxy n’existe plus sur Discord.",
                webhook_missing: "Le webhook ayant créé ce message n’existe plus. GreyCore ne peut plus modifier ce message automatiquement.",
                unknown_channel: "Le salon ou thread contenant ce message Proxy n’existe plus.",
                missing_permissions: "GreyCore n’a plus les permissions nécessaires pour agir dans le salon ou thread de ce message Proxy.",
                missing_access: "GreyCore n’a plus accès au salon ou thread contenant ce message Proxy.",
                locked: "Le thread contenant ce message Proxy est verrouillé.",
                discord_error: "Discord n’a pas permis de modifier ce message Proxy. Réessaie plus tard."
            },
            delete: {
                message_missing: "Ce message Proxy n’existait déjà plus sur Discord. Sa référence GreyCore a été supprimée.",
                webhook_missing: "Le webhook ayant créé ce message n’existe plus. GreyCore ne peut pas confirmer sa suppression automatique.",
                unknown_channel: "Le salon ou thread contenant ce message Proxy n’existe plus.",
                missing_permissions: "GreyCore n’a plus les permissions nécessaires pour agir dans le salon ou thread de ce message Proxy.",
                missing_access: "GreyCore n’a plus accès au salon ou thread contenant ce message Proxy.",
                locked: "Le thread contenant ce message Proxy est verrouillé.",
                discord_error: "Discord n’a pas permis de supprimer ce message Proxy. Réessaie plus tard."
            }
        };

        return messages[action]?.[result?.status]
            || "Cette opération Proxy n’a pas pu être effectuée.";
    }
}

module.exports = new ProxyHistoricalWebhookService();
