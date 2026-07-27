const messageUpdateRouter =
    require(
        "./handlers/messageUpdate"
    );

module.exports = {
    name: "messageUpdate",

    async execute(
        oldMessage,
        newMessage
    ) {
        await messageUpdateRouter(
            newMessage
        );
    }
};
