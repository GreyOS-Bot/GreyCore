const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "Voir la fiche reconnait un proxy externe GreyCore",
    async () => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });
        const calls = [];

        const dashboardData = {
            character: {
                id: "character",
                discord_user_id: "owner"
            },
            counts: {
                relations: 0
            }
        };

        try {
            stubModule(
                "src/managers/ProxyMessageManager.js",
                {
                    getByWebhookMessageId:
                        () => null
                }
            );

            stubModule(
                "src/v2/services/dashboard/CharacterDashboardManager.js",
                {
                    getPlayableDashboardByProxyName:
                        (guildId, proxyName) => {
                            calls.push([
                                "lookup",
                                guildId,
                                proxyName
                            ]);

                            return dashboardData;
                        }
                }
            );

            stubModule(
                "src/v2/pages/character/CharacterDashboardPage.js",
                {
                    build:
                        (character, counts, options) => {
                            calls.push([
                                "build",
                                character.id,
                                counts.relations,
                                options.isOwner
                            ]);

                            return {
                                content: "Fiche GreyCore"
                            };
                        }
                }
            );

            stubModule(
                "src/v2/core/policies/CharacterManagementPolicy.js",
                {
                    isOwner: () => false
                }
            );

            for (
                const modulePath
                of [
                    "../src/v2/managers/GuildModuleV2Manager",
                    "../src/v2/repositories/GuildModuleRepository",
                    "../src/commands/proxy/voirFiche"
                ]
            ) {
                delete require.cache[
                    require.resolve(modulePath)
                ];
            }

            const command =
                require(
                    "../src/commands/proxy/voirFiche"
                );

            const interaction = {
                guildId: "guild",
                targetMessage: {
                    id: "external-message",
                    author: {
                        username: "Reya"
                    }
                },
                reply: async payload => {
                    interaction.payload = payload;
                }
            };

            await command.execute(interaction);

            assert.deepEqual(
                calls,
                [
                    [
                        "lookup",
                        "guild",
                        "Reya"
                    ],
                    [
                        "build",
                        "character",
                        0,
                        false
                    ]
                ]
            );

            assert.deepEqual(
                interaction.payload,
                {
                    content: "Fiche GreyCore",
                    ephemeral: true
                }
            );
        } finally {
            isolated.cleanup();
        }
    }
);
