const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "/personnage fiche ouvre la fiche jouable d’un autre utilisateur en lecture seule",
    async () => {
        const calls = [];
        let query = null;

        stubModule(
            "src/database/database.js",
            {
                prepare: statement => {
                    query = statement;

                    return {
                        get: (...values) => {
                            calls.push([
                                "query",
                                values
                            ]);

                            return {
                                id: "reya"
                            };
                        }
                    };
                }
            }
        );
        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    user: {
                        getOrCreate: () => ({})
                    },
                    library: {
                        getStatistics: () => ({})
                    }
                }
            }
        );
        stubModule(
            "src/v2/views/home/LibraryHomeView.js",
            {
                build: () => ({})
            }
        );
        stubModule(
            "src/v2/pages/character/OpenCharacterDashboardPage.js",
            {
                execute: async (
                    interaction,
                    characterId
                ) => {
                    calls.push([
                        "open",
                        characterId
                    ]);

                    await interaction.update({
                        content: "Fiche en lecture seule"
                    });
                }
            }
        );
        stubModule(
            "src/v2/modals/CharacterCreateModal.js",
            {
                build: () => ({})
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                deferPrivate: async interaction => {
                    interaction.deferred = true;
                },
                replyPrivate: async () => {}
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/personnage"
            );

        delete require.cache[commandPath];

        const command =
            require(
                "../src/commands/personnage"
            );

        const interaction = {
            guildId: "guild",
            user: {
                id: "another-user"
            },
            options: {
                getSubcommand: () => "fiche",
                getString: () => "Reya"
            },
            reply: async payload => {
                calls.push([
                    "reply",
                    payload
                ]);
            },
            editReply: async payload => {
                calls.push([
                    "editReply",
                    payload
                ]);
            }
        };

        await command.execute(interaction);

        assert.match(
            query,
            /installation.status = 'approved'/
        );
        assert.match(
            query,
            /installation.proxy_enabled = 1/
        );
        assert.doesNotMatch(
            query,
            /user.discord_user_id/
        );
        assert.deepEqual(
            calls,
            [
                [
                    "query",
                    [
                        "guild",
                        "Reya"
                    ]
                ],
                [
                    "open",
                    "reya"
                ],
                [
                    "editReply",
                    {
                        content: "Fiche en lecture seule"
                    }
                ]
            ]
        );
    }
);

test(
    "/personnage fiche propose les personnages jouables du serveur",
    async () => {
        const calls = [];

        stubModule(
            "src/database/database.js",
            {
                prepare: statement => ({
                    all: (...values) => {
                        calls.push([
                            statement,
                            values
                        ]);

                        return [
                            { proxy_name: "Reya" },
                            { proxy_name: "Rêya" }
                        ];
                    }
                })
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/personnage"
            );

        delete require.cache[commandPath];

        const command =
            require(
                "../src/commands/personnage"
            );

        const interaction = {
            guildId: "guild",
            options: {
                getSubcommand: () => "fiche",
                getFocused: () => "rey"
            },
            respond: async choices => {
                calls.push([
                    "respond",
                    choices
                ]);
            }
        };

        await command.autocomplete(
            interaction
        );

        assert.match(
            calls[0][0],
            /installation\.status = 'approved'/
        );
        assert.deepEqual(
            calls[0][1],
            ["guild", "%rey%"]
        );
        assert.deepEqual(
            calls[1],
            [
                "respond",
                [
                    { name: "Reya", value: "Reya" },
                    { name: "Rêya", value: "Rêya" }
                ]
            ]
        );
    }
);
