const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "une correction demandée par le staff peut modifier l'alias affiché",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    profile: {
                        update: (
                            continuityId,
                            changes
                        ) => calls.push([
                            "update",
                            continuityId,
                            changes
                        ])
                    },
                    validation: {
                        reopenInstallation: data =>
                            calls.push([
                                "reopen",
                                data
                            ])
                    }
                }
            }
        );
        stubModule(
            "src/v2/services/validation/RejectedProfileContextService.js",
            {
                resolve: () => ({
                    installation: {
                        id: 12,
                        status: "suspended"
                    },
                    continuity: {
                        id: "continuity"
                    },
                    character: {
                        proxy_name: "Lydia"
                    },
                    profile: {
                        alias: "Lydya"
                    }
                })
            }
        );
        stubModule(
            "src/v2/views/validation/RejectedProfileView.js",
            {
                updated: () => ({
                    content: "updated"
                })
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async () => {},
                replyPrivate: async (
                    _interaction,
                    payload
                ) => calls.push([
                    "reply",
                    payload
                ])
            }
        );

        const handlerPath = require.resolve(
            "../src/v2/interactions/modals/updateRejectedProfile"
        );
        delete require.cache[handlerPath];

        const handler = require(
            "../src/v2/interactions/modals/updateRejectedProfile"
        );

        const values = {
            firstname: "Lydia",
            lastname: "Grey",
            age: "21",
            alias: "Lydia",
            story: "Histoire corrigée"
        };

        await handler({
            customId:
                "v2_rejected_profile_submit:12",
            fields: {
                getTextInputValue: field =>
                    values[field]
            }
        });

        assert.deepEqual(
            calls[0],
            [
                "update",
                "continuity",
                {
                    firstname: "Lydia",
                    lastname: "Grey",
                    age: 21,
                    alias: "Lydia",
                    story: "Histoire corrigée"
                }
            ]
        );
        assert.deepEqual(
            calls[1],
            [
                "reopen",
                {
                    installationId: "12"
                }
            ]
        );
    }
);
