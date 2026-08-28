class WebhookManager {
    async getOrCreateWebhook(channel) {
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

        const webhooks =
            await webhookChannel.fetchWebhooks();

        let webhook = webhooks.find(wh =>
            wh.owner?.id === webhookChannel.client.user.id &&
            wh.name === "Greycore Proxy"
        );

        if (!webhook) {
            webhook = await webhookChannel.createWebhook({
                name: "Greycore Proxy",
                reason: "Webhook proxy Greycore"
            });
        }

        return webhook;
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
