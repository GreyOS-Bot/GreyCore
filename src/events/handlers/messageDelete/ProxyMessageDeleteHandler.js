const proxyMessageManager =
    require(
        "../../../managers/ProxyMessageManager"
    );

const {
    consumeInternalDelete
} = require(
    "../../../services/internalDeleteService"
);

const historicalWebhookService = require(
    "../../../v2/core/services/ProxyHistoricalWebhookService"
);

const logger = require(
    "../../../v2/core/services/TechnicalLogger"
).create("ProxyMessageDeleteHandler");

module.exports =
    async function proxyMessageDeleteHandler(
        message
    ) {
        if (!message.guild) {
            return false;
        }

        if (
            consumeInternalDelete(
                message.id
            )
        ) {
            console.log(
                "🛡️ Suppression interne ignorée."
            );

            return true;
        }

        if (message.author?.bot) {
            return false;
        }

        const proxyRecord =
            proxyMessageManager.get(
                message.id
            );

        if (!proxyRecord) {
            return false;
        }

        const result =
            await historicalWebhookService.delete({
                client: message.client,
                channel:
                    message.channel || null,
                webhookId:
                    proxyRecord.webhook_id,
                webhookMessageId:
                    proxyRecord.webhook_message_id
            });

        if (
            result.status !== "success"
            && result.status !== "message_missing"
        ) {
            logger.warn(
                "Suppression Proxy historique non confirmée.",
                {
                    discordMessageId:
                        message.id,
                    proxyWebhookMessageId:
                        proxyRecord.webhook_message_id,
                    channelId:
                        proxyRecord.channel_id,
                    classification:
                        result.status,
                    discordCode:
                        result.discordCode
                }
            );
            return true;
        }

        proxyMessageManager.delete(
            message.id
        );

        console.log(
            "🗑️ Message proxy supprimé après suppression manuelle."
        );

        return true;
    };
