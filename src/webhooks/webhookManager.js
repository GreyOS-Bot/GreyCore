class WebhookManager {
    async getOrCreateWebhook(
        channel,
        options = {}
    ) {
        const threadAccessService = require(
            "../v2/core/services/DiscordThreadAccessService"
        );
        const access =
            await threadAccessService.ensureWritable(
                channel
            );

        if (!access.ready) {
            throw threadAccessService.errorFor(
                access,
                "webhook"
            );
        }

        channel = access.channel || channel;

        const webhookChannel =
            await this.resolveWebhookChannel(
                channel
            );

        if (!webhookChannel) {
            throw new Error(
                "Le salon parent de ce fil est introuvable."
            );
        }

        let webhooks;

        try {
            webhooks =
                await webhookChannel.fetchWebhooks();
        } catch (error) {
            throw this.withDiagnostic(error);
        }

        const excludedIds = new Set(
            options.excludeWebhookIds || []
        );

        let webhook = this.selectCanonicalWebhook(
            webhooks,
            webhookChannel.client.user.id,
            excludedIds
        );

        if (!webhook) {
            try {
                webhook = await webhookChannel.createWebhook({
                    name: "Greycore Proxy",
                    reason: "Webhook proxy Greycore"
                });
            } catch (error) {
                throw this.withDiagnostic(error);
            }
        }

        return webhook;
    }

    async sendWithWebhook(
        channel,
        payload
    ) {
        const {
            withThreadId
        } = require(
            "../v2/core/services/ProxyThreadContext"
        );

        const firstWebhook =
            await this.getOrCreateWebhook(channel);

        try {
            const webhookMessage =
                await firstWebhook.send(
                    withThreadId(channel, payload)
                );

            return {
                webhook: firstWebhook,
                webhookMessage
            };
        } catch (error) {
            const diagnostic =
                this.classifyWebhookError(error);

            if (diagnostic.kind !== "UNKNOWN_WEBHOOK") {
                throw this.withDiagnostic(
                    error,
                    diagnostic
                );
            }

            const retryWebhook =
                await this.getOrCreateWebhook(
                    channel,
                    {
                        excludeWebhookIds: [
                            firstWebhook.id
                        ]
                    }
                );

            try {
                const webhookMessage =
                    await retryWebhook.send(
                        withThreadId(channel, payload)
                    );

                return {
                    webhook: retryWebhook,
                    webhookMessage
                };
            } catch (retryError) {
                throw this.withDiagnostic(
                    retryError
                );
            }
        }
    }

    selectCanonicalWebhook(
        webhooks,
        ownerId,
        excludedIds = new Set()
    ) {
        return this.toWebhookArray(webhooks)
            .filter(webhook =>
                webhook.owner?.id === ownerId
                && webhook.name === "Greycore Proxy"
                && !excludedIds.has(webhook.id)
            )
            .sort((left, right) =>
                this.compareWebhookAge(left, right)
            )[0] || null;
    }

    toWebhookArray(webhooks) {
        if (Array.isArray(webhooks)) {
            return [...webhooks];
        }

        if (typeof webhooks?.values === "function") {
            return [...webhooks.values()];
        }

        return [];
    }

    compareWebhookAge(left, right) {
        const leftTimestamp =
            Number(left?.createdTimestamp);
        const rightTimestamp =
            Number(right?.createdTimestamp);

        if (
            Number.isFinite(leftTimestamp)
            && Number.isFinite(rightTimestamp)
            && leftTimestamp !== rightTimestamp
        ) {
            return leftTimestamp - rightTimestamp;
        }

        try {
            const leftId = BigInt(left.id);
            const rightId = BigInt(right.id);

            if (leftId < rightId) return -1;
            if (leftId > rightId) return 1;
            return 0;
        } catch {
            return String(left?.id || "")
                .localeCompare(
                    String(right?.id || "")
                );
        }
    }

    classifyWebhookError(error) {
        const code = Number(error?.code);
        const kinds = {
            10015: "UNKNOWN_WEBHOOK",
            30007: "WEBHOOK_LIMIT_REACHED",
            50001: "MISSING_ACCESS",
            50013: "MISSING_PERMISSIONS"
        };

        return {
            kind:
                kinds[code]
                || "WEBHOOK_ERROR",
            discordCode:
                Number.isFinite(code)
                    ? code
                    : error?.code ?? null,
            retryable:
                code === 10015
        };
    }

    withDiagnostic(
        error,
        diagnostic = null
    ) {
        const currentError =
            error instanceof Error
                ? error
                : new Error(
                    String(error || "Erreur webhook inconnue")
                );

        currentError.webhookDiagnostic =
            diagnostic
            || this.classifyWebhookError(currentError);

        return currentError;
    }

    async resolveWebhookChannel(
        channel
    ) {
        if (
            typeof channel?.isThread !==
            "function"
            || !channel.isThread()
        ) {
            return channel;
        }

        if (channel.parent) {
            return channel.parent;
        }

        if (
            channel.parentId
            && typeof channel.guild?.channels?.fetch ===
                "function"
        ) {
            return channel.guild.channels.fetch(
                channel.parentId
            );
        }

        return null;
    }
}

module.exports = new WebhookManager();
