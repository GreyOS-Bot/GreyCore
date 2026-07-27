const path =
    require("node:path");

function stubModule(
    modulePath,
    exports
) {
    const resolvedPath =
        require.resolve(
            path.resolve(
                modulePath
            )
        );

    require.cache[resolvedPath] = {
        id:
            resolvedPath,
        filename:
            resolvedPath,
        loaded:
            true,
        exports
    };
}

module.exports = {
    stubModule
};
