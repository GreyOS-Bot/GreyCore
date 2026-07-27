class WebhookManager {
    async getOrCreateWebhook(channel) {
        const webhooks = await channel.fetchWebhooks();

        let webhook = webhooks.find(wh =>
            wh.owner?.id === channel.client.user.id &&
            wh.name === "Greycore Proxy"
        );

        if (!webhook) {
            webhook = await channel.createWebhook({
                name: "Greycore Proxy",
                reason: "Webhook proxy Greycore"
            });
        }

        return webhook;
    }
}

module.exports = new WebhookManager();