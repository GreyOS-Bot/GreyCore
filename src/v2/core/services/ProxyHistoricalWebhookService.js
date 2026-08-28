const webhookManager = require("../../../webhooks/webhookManager");
const threadAccessService = require("./DiscordThreadAccessService");
const { getThreadId, withThreadId } = require("./ProxyThreadContext");

class ProxyHistoricalWebhookService {
    async edit({ client, channel, webhookId, webhookMessageId, payload }) {
        const prepared = await this.ensureChannelAccess(channel);
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

    async delete({ client, channel, webhookId, webhookMessageId }) {
        const prepared = await this.ensureChannelAccess(channel);
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

    async ensureChannelAccess(channel) {
        if (!channel) {
            return this.unavailable("missing_access", null);
        }

        const access = await threadAccessService.ensureWritable(channel);
        if (!access.ready) {
            return this.unavailable(
                access.status === "missing_permissions"
                    ? "missing_permissions"
                    : "missing_access",
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
                missing_permissions: "GreyCore n’a pas les permissions nécessaires pour modifier ce message.",
                missing_access: "GreyCore n’a plus accès au salon de ce message Proxy.",
                discord_error: "Discord n’a pas permis de modifier ce message Proxy. Réessaie plus tard."
            },
            delete: {
                message_missing: "Ce message Proxy n’existait déjà plus sur Discord. Sa référence GreyCore a été supprimée.",
                webhook_missing: "Le webhook ayant créé ce message n’existe plus. GreyCore ne peut pas confirmer sa suppression automatique.",
                missing_permissions: "GreyCore n’a pas les permissions nécessaires pour supprimer ce message.",
                missing_access: "GreyCore n’a plus accès au salon de ce message Proxy.",
                discord_error: "Discord n’a pas permis de supprimer ce message Proxy. Réessaie plus tard."
            }
        };

        return messages[action]?.[result?.status]
            || "Cette opération Proxy n’a pas pu être effectuée.";
    }
}

module.exports = new ProxyHistoricalWebhookService();
