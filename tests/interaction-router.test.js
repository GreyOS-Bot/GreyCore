const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "l’aiguillage s’arrête au premier routeur compatible",
    async () => {
        const calls = [];

        const routerPaths = [
            "src/v2/router/autocompleteRouter.js",
            "src/v2/router/commandRouter.js",
            "src/v2/router/modalRouter.js",
            "src/v2/router/selectRouter.js",
            "src/v2/router/buttonRouter.js"
        ];

        for (
            const [
                index,
                routerPath
            ] of routerPaths.entries()
        ) {
            stubModule(
                routerPath,
                async () => {
                    calls.push(index);

                    return index === 2;
                }
            );
        }

        const interactionRouter =
            require(
                "../src/v2/router/interactionRouter"
            );

        assert.equal(
            await interactionRouter({}),
            true
        );

        assert.deepEqual(
            calls,
            [0, 1, 2]
        );
    }
);

test(
    "un ancien composant GreyCore reçoit une réponse propre sans intercepter un autre customId",
    async () => {
        const routerPaths = [
            "src/v2/router/autocompleteRouter.js",
            "src/v2/router/commandRouter.js",
            "src/v2/router/modalRouter.js",
            "src/v2/router/selectRouter.js",
            "src/v2/router/buttonRouter.js"
        ];

        for (const routerPath of routerPaths) {
            stubModule(
                routerPath,
                async () => false
            );
        }

        const routerPath = require.resolve(
            "../src/v2/router/interactionRouter"
        );
        delete require.cache[routerPath];
        const interactionRouter =
            require(routerPath);

        const staleInteraction = {
            customId: "v2_removed_feature:old",
            isButton: () => true,
            inGuild: () => true,
            reply: async function (payload) {
                this.payload = payload;
            }
        };

        assert.equal(
            await interactionRouter(
                staleInteraction
            ),
            true
        );
        assert.match(
            staleInteraction.payload.content,
            /interface n’est plus active/i
        );

        const foreignInteraction = {
            customId: "another_app:button",
            isButton: () => true,
            reply: async function () {
                this.replied = true;
            }
        };

        assert.equal(
            await interactionRouter(
                foreignInteraction
            ),
            false
        );
        assert.equal(
            foreignInteraction.replied,
            undefined
        );
    }
);
