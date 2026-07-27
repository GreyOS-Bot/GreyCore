const pendingUploadRouter =
    require(
        "./PendingUploadRouter"
    );

const proxyMessageHandler =
    require(
        "./ProxyMessageHandler"
    );

module.exports =
    async function messageCreateRouter(
        message
    ) {
        if (message.author.bot) {
            return false;
        }

        if (
            await pendingUploadRouter(
                message
            )
        ) {
            return true;
        }

        return proxyMessageHandler(
            message
        );
    };
