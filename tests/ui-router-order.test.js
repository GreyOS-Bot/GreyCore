const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les boutons V2 passent au premier routeur compatible",
    async () => {
        const calls = [];
        const routerPaths = [
            "src/v2/router/buttons/PageNavigationRouter.js",
            "src/v2/router/buttons/EncounterRouter.js",
            "src/v2/router/buttons/RelationshipRouter.js",
            "src/v2/router/buttons/StateRouter.js",
            "src/v2/router/buttons/ProfileRouter.js",
            "src/v2/router/buttons/PhoneRouter.js",
            "src/v2/router/buttons/ValidationRouter.js",
            "src/v2/router/buttons/LibraryRouter.js",
            "src/v2/router/buttons/OutfitRouter.js",
            "src/v2/router/buttons/AssetRouter.js",
            "src/v2/router/buttons/CharacterRouter.js"
        ];

        routerPaths.forEach(
            (routerPath, index) => {
                stubModule(
                    routerPath,
                    async () => {
                        calls.push(index);

                        return index === 2;
                    }
                );
            }
        );

        const buttonRouter =
            require(
                "../src/v2/router/buttonRouter"
            );

        assert.equal(
            await buttonRouter({
                isButton: () => false
            }),
            false
        );

        assert.deepEqual(calls, []);

        assert.equal(
            await buttonRouter({
                isButton: () => true
            }),
            true
        );

        assert.deepEqual(calls, [0, 1, 2]);
    }
);

test(
    "les formulaires V2 passent au premier routeur compatible",
    async () => {
        const calls = [];
        const routerPaths = [
            "src/v2/router/modals/CharacterModalRouter.js",
            "src/v2/router/modals/RelationshipModalRouter.js",
            "src/v2/router/modals/OutfitModalRouter.js",
            "src/v2/router/modals/AssetModalRouter.js",
            "src/v2/router/modals/PhoneModalRouter.js",
            "src/v2/router/modals/EncounterModalRouter.js",
            "src/v2/router/modals/ProfileModalRouter.js",
            "src/v2/router/modals/StateModalRouter.js",
            "src/v2/router/modals/ValidationModalRouter.js",
            "src/v2/router/modals/ProxyModalRouter.js"
        ];

        routerPaths.forEach(
            (routerPath, index) => {
                stubModule(
                    routerPath,
                    async () => {
                        calls.push(index);

                        return index === 3;
                    }
                );
            }
        );

        const modalRouter =
            require(
                "../src/v2/router/modalRouter"
            );

        assert.equal(
            await modalRouter({
                isModalSubmit: () => false
            }),
            false
        );

        assert.deepEqual(calls, []);

        assert.equal(
            await modalRouter({
                isModalSubmit: () => true
            }),
            true
        );

        assert.deepEqual(calls, [0, 1, 2, 3]);
    }
);

test(
    "les menus V2 passent au premier routeur compatible",
    async () => {
        const calls = [];
        const routerPaths = [
            "src/v2/router/selects/GuildModuleSelectRouter.js",
            "src/v2/router/selects/OutfitSelectRouter.js",
            "src/v2/router/selects/AssetSelectRouter.js",
            "src/v2/router/selects/EncounterSelectRouter.js",
            "src/v2/router/selects/RelationshipSelectRouter.js",
            "src/v2/router/selects/StateSelectRouter.js",
            "src/v2/router/selects/PhoneSelectRouter.js",
            "src/v2/router/selects/LibrarySelectRouter.js"
        ];

        routerPaths.forEach(
            (routerPath, index) => {
                stubModule(
                    routerPath,
                    async () => {
                        calls.push(index);

                        return index === 4;
                    }
                );
            }
        );

        const selectRouter =
            require(
                "../src/v2/router/selectRouter"
            );

        assert.equal(
            await selectRouter({
                isStringSelectMenu: () => false
            }),
            false
        );

        assert.deepEqual(calls, []);

        assert.equal(
            await selectRouter({
                isStringSelectMenu: () => true
            }),
            true
        );

        assert.deepEqual(calls, [0, 1, 2, 3, 4]);
    }
);
