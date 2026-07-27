const proxyMessageUpdateHandler =
    require(
        "./ProxyMessageUpdateHandler"
    );

module.exports =
    async function messageUpdateRouter(
        message
    ) {
        return proxyMessageUpdateHandler(
            message
        );
    };
