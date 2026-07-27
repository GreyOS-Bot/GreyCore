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
