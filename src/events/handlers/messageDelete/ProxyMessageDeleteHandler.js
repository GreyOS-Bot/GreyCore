const proxyMessageManager =
    require(
        "../../../managers/ProxyMessageManager"
    );

const {
    consumeInternalDelete
} = require(
    "../../../services/internalDeleteService"
);

const {
    getThreadId
} = require(
    "../../../v2/core/services/ProxyThreadContext"
);

const threadAccessService = require(
    "../../../v2/core/services/DiscordThreadAccessService"
);

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

        try {
            let writableChannel =
                message.channel || null;

            if (writableChannel) {
                const access =
                    await threadAccessService.ensureWritable(
                        writableChannel
                    );

                if (!access.ready) {
                    throw threadAccessService.errorFor(
                        access,
                        "proxy_delete"
                    );
                }

                writableChannel =
                    access.channel
                    || writableChannel;
            }

            const webhook =
                await message.client
                    .fetchWebhook(
                        proxyRecord
                            .webhook_id
                    );

            const threadId =
                getThreadId(
                    writableChannel
                );

            if (threadId) {
                await webhook.deleteMessage(
                    proxyRecord
                        .webhook_message_id,
                    threadId
                );
            } else {
                await webhook.deleteMessage(
                    proxyRecord
                        .webhook_message_id
                );
            }
        } catch (error) {
            if (
                error.code !== 10008
                &&
                error.code !== 10015
            ) {
                console.error(
                    "❌ Erreur lors de la suppression du proxy :",
                    error
                );

                return true;
            }
        }

        proxyMessageManager.delete(
            message.id
        );

        console.log(
            "🗑️ Message proxy supprimé après suppression manuelle."
        );

        return true;
    };
