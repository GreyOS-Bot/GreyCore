const messageCreateRouter =
    require(
        "./handlers/messageCreate"
    );

module.exports = {
    name: "messageCreate",

    async execute(message) {
        await messageCreateRouter(
            message
        );
    }
};
