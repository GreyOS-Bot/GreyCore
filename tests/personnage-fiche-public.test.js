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
                privatePayload: (
                    interaction,
                    payload
                ) => payload,
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
                    "reply",
                    {
                        content: "Fiche en lecture seule"
                    }
                ]
            ]
        );
    }
);
