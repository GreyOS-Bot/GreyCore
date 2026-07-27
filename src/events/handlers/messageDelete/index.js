const proxyMessageDeleteHandler =
    require(
        "./ProxyMessageDeleteHandler"
    );

module.exports =
    async function messageDeleteRouter(
        message
    ) {
        return proxyMessageDeleteHandler(
            message
        );
    };
