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
            const webhook =
                await message.client
                    .fetchWebhook(
                        proxyRecord
                            .webhook_id
                    );

            const threadId =
                getThreadId(
                    message.channel
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
