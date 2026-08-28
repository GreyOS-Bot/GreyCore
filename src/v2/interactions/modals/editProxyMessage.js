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

const {
    withThreadId
} = require(
    "../../core/services/ProxyThreadContext"
);

const threadAccessService = require(
    "../../core/services/DiscordThreadAccessService"
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

            let writableChannel =
                interaction.channel || null;

            if (writableChannel) {
                const access =
                    await threadAccessService.ensureWritable(
                        writableChannel
                    );

                if (!access.ready) {
                    throw threadAccessService.errorFor(
                        access,
                        "proxy_edit"
                    );
                }

                writableChannel =
                    access.channel
                    || writableChannel;
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
                withThreadId(
                    writableChannel,
                    {
                        content:
                            newContent
                    }
                )
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
