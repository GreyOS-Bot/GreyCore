const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "ajouter un proxy par modification envoie le message via GreyCore",
    async () => {
        const calls = [];

        stubModule(
            "src/managers/ProxyMessageManager.js",
            {
                get: () => null
            }
        );
        stubModule(
            "src/events/handlers/messageCreate/ProxyMessageHandler.js",
            async message => {
                calls.push(message);

                return true;
            }
        );

        const handlerPath =
            require.resolve(
                "../src/events/handlers/messageUpdate/ProxyMessageUpdateHandler"
            );

        delete require.cache[handlerPath];

        const handler =
            require(
                "../src/events/handlers/messageUpdate/ProxyMessageUpdateHandler"
            );

        const message = {
            id: "gif-message",
            content:
                "Reya: https://klipy.com/gifs/greetings-PSr",
            author: {
                bot: false
            },
            guild: {
                id: "guild"
            }
        };

        assert.equal(
            await handler(message),
            true
        );
        assert.deepEqual(
            calls,
            [message]
        );
    }
);
