const proxyMessageManager =
    require(
        "../../../managers/ProxyMessageManager"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "editProxyMessage"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

const historicalWebhookService = require(
    "../../core/services/ProxyHistoricalWebhookService"
);

module.exports =
    async function editProxyMessage(
        interaction
    ) {
        try {
            const discordMessageId =
                interaction.customId
                    .split(":")[1];

            const newContent =
                interaction.fields
                    .getTextInputValue(
                        "proxy_content"
                    )
                    .trim();

            if (
                !discordMessageId
                || !newContent
            ) {
                return replyError(
                    interaction,
                    "Le message proxy ne peut pas être vide."
                );
            }

            const proxyRecord =
                proxyMessageManager
                    .get(
                        discordMessageId
                    );

            if (!proxyRecord) {
                return replyError(
                    interaction,
                    "Message proxy introuvable."
                );
            }

            if (
                String(
                    proxyRecord
                        .author_id
                )
                !== String(
                    interaction.user.id
                )
            ) {
                return replyError(
                    interaction,
                    "Tu ne peux modifier que tes propres messages proxy."
                );
            }

            const result =
                await historicalWebhookService.edit({
                    client:
                        interaction.client,
                    channel:
                        interaction.channel || null,
                    webhookId:
                        proxyRecord.webhook_id,
                    webhookMessageId:
                        proxyRecord.webhook_message_id,
                    payload: {
                        content:
                            newContent
                    }
                });

            if (!result.success) {
                logger.warn(
                    "Édition Proxy historique impossible.",
                    {
                        discordMessageId,
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

                return replyError(
                    interaction,
                    historicalWebhookService
                        .userMessage(result, "edit")
                );
            }

            return replyPrivate(
                interaction,
                "✅ Message proxy modifié."
            );
        } catch (error) {
            logger.error(
                "Impossible de modifier le message proxy.",
                error
            );

            return replyError(
                interaction,
                "Impossible de modifier ce message proxy."
            );
        }
    };
