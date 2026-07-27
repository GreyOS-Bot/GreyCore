const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "une erreur rattrapée par le routeur de commande est aussi envoyée au staff",
    async () => {
        const reports = [];
        const replies = [];

        stubModule(
            "src/v2/services/StaffErrorLogService.js",
            {
                report: async data =>
                    reports.push(data)
            }
        );
        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create: () => ({
                    error: () => {}
                })
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async (
                    interaction,
                    message
                ) => replies.push([
                    interaction,
                    message
                ])
            }
        );

        const routerPath =
            require.resolve(
                "../src/v2/router/commandRouter"
            );

        delete require.cache[
            routerPath
        ];

        const commandRouter =
            require(
                "../src/v2/router/commandRouter"
            );

        const interaction = {
            guildId: "guild",
            commandName: "test",
            user: {
                id: "user"
            },
            isChatInputCommand:
                () => true,
            isMessageContextMenuCommand:
                () => false,
            client: {
                commands: new Map([
                    [
                        "test",
                        {
                            execute: async () => {
                                throw new Error(
                                    "Erreur test"
                                );
                            }
                        }
                    ]
                ])
            }
        };

        assert.equal(
            await commandRouter(interaction),
            true
        );

        assert.equal(
            reports.length,
            1
        );

        assert.equal(
            reports[0].scope,
            "Commande /test"
        );

        assert.equal(
            reports[0].guildId,
            "guild"
        );

        assert.equal(
            replies[0][1],
            "Une erreur est survenue."
        );
    }
);
