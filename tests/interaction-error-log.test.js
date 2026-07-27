const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "une erreur d’interaction est signalée au staff et reste privée pour le joueur",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/router/index.js",
            {
                interactionRouter:
                    async () => {
                        throw new Error(
                            "Erreur inattendue"
                        );
                    }
            }
        );
        stubModule(
            "src/v2/services/StaffErrorLogService.js",
            {
                report: async data =>
                    calls.push([
                        "report",
                        data
                    ])
            }
        );
        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create: () => ({
                    error: () => {},
                    warn: () => {}
                })
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async (
                    interaction,
                    message
                ) => {
                    calls.push([
                        "reply",
                        message
                    ]);
                }
            }
        );

        const event =
            require(
                "../src/events/interactionCreate"
            );

        await event.execute({
            guildId: "guild",
            commandName: "personnage",
            user: {
                id: "user"
            },
            isAutocomplete: () => false
        });

        assert.equal(
            calls[0][0],
            "report"
        );
        assert.equal(
            calls[0][1].guildId,
            "guild"
        );
        assert.deepEqual(
            calls[1],
            [
                "reply",
                "Une erreur inattendue est survenue. Le staff a été prévenu."
            ]
        );
    }
);
