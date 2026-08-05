const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la navigation accuse le clic avant de construire une page lente",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/framework/index.js",
            {
                router: {
                    parse: () => ({
                        route:
                            "page:character:relationships",
                        parameter: "character"
                    }),
                    resolve: () => ({
                        execute: async interaction => {
                            calls.push("handler");
                            await interaction.update({
                                content: "Relations"
                            });
                        }
                    })
                }
            }
        );
        stubModule(
            "src/v2/pages/index.js",
            {
                registerPages: () => {}
            }
        );
        stubModule(
            "src/v2/services/StaffErrorLogService.js",
            {
                report: async () => {}
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                editOrReplyError: async () => {}
            }
        );

        const routerPath = require.resolve(
            "../src/v2/router/buttons/PageNavigationRouter"
        );
        delete require.cache[routerPath];
        const router = require(routerPath);

        const interaction = {
            customId:
                "page:character:relationships:character",
            isButton: () => true,
            deferUpdate: async function () {
                calls.push("defer");
                this.deferred = true;
            },
            editReply: async payload => {
                calls.push([
                    "edit",
                    payload
                ]);
            }
        };

        assert.equal(
            await router(interaction),
            true
        );
        assert.deepEqual(
            calls,
            [
                "defer",
                "handler",
                [
                    "edit",
                    { content: "Relations" }
                ]
            ]
        );
    }
);

test(
    "une interaction déjà expirée produit un seul signalement",
    async () => {
        let reports = 0;

        stubModule(
            "src/v2/framework/index.js",
            {
                router: {
                    parse: () => ({
                        route: "page:character:relationships",
                        parameter: "character"
                    }),
                    resolve: () => ({
                        execute: async () => {
                            throw new Error(
                                "Le handler ne doit pas démarrer."
                            );
                        }
                    })
                }
            }
        );
        stubModule(
            "src/v2/pages/index.js",
            {
                registerPages: () => {}
            }
        );
        stubModule(
            "src/v2/services/StaffErrorLogService.js",
            {
                report: async () => {
                    reports += 1;
                }
            }
        );

        const routerPath = require.resolve(
            "../src/v2/router/buttons/PageNavigationRouter"
        );
        delete require.cache[routerPath];
        const router = require(routerPath);

        const handled = await router({
            customId:
                "page:character:relationships:character",
            guildId: "guild",
            isButton: () => true,
            deferUpdate: async () => {
                const error = new Error(
                    "Unknown interaction"
                );
                error.code = 10062;
                throw error;
            }
        });

        assert.equal(handled, true);
        assert.equal(reports, 1);
    }
);
