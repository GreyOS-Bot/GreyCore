const messageDeleteRouter =
    require(
        "./handlers/messageDelete"
    );

module.exports = {
    name: "messageDelete",

    async execute(message) {
        await messageDeleteRouter(
            message
        );
    }
};
