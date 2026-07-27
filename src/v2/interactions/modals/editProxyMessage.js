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

            const webhook =
                await interaction.client
                    .fetchWebhook(
                        proxyRecord
                            .webhook_id
                    );

            await webhook.editMessage(
                proxyRecord
                    .webhook_message_id,
                {
                    content:
                        newContent
                }
            );

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
