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

test(
    "Voir la fiche reconnaît le prénom affiché quand le proxy est simplifié",
    () => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        try {
            const now =
                "2026-07-29T00:00:00.000Z";

            isolated.database.exec(`
                INSERT INTO Guilds (
                    id,
                    name,
                    created_at
                )
                VALUES (
                    'guild',
                    'GreyOS',
                    '${now}'
                );

                INSERT INTO UsersV2 (
                    discord_user_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    'owner',
                    '${now}',
                    '${now}'
                );

                INSERT INTO CharactersV2 (
                    id,
                    owner_user_id,
                    proxy_name,
                    base_firstname,
                    character_type,
                    is_archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    'character',
                    1,
                    'Ino',
                    'Iño',
                    'personnage_joue',
                    0,
                    '${now}',
                    '${now}'
                );

                INSERT INTO CharacterContinuitiesV2 (
                    id,
                    character_id,
                    name,
                    mode,
                    firstname,
                    is_archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    'continuity',
                    'character',
                    'GreyOS',
                    'original',
                    'Iño',
                    0,
                    '${now}',
                    '${now}'
                );

                INSERT INTO CharacterProfilesV2 (
                    continuity_id,
                    firstname,
                    alias,
                    created_at,
                    updated_at
                )
                VALUES (
                    'continuity',
                    'Iño',
                    'Iño',
                    '${now}',
                    '${now}'
                );

                INSERT INTO CharacterGuildInstallationsV2 (
                    character_id,
                    continuity_id,
                    guild_id,
                    status,
                    visibility,
                    proxy_enabled,
                    installed_at,
                    updated_at
                )
                VALUES (
                    'character',
                    'continuity',
                    'guild',
                    'approved',
                    'private',
                    1,
                    '${now}',
                    '${now}'
                );
            `);

            const repositoryPath =
                require.resolve(
                    "../src/v2/repositories/DashboardRepository"
                );

            delete require.cache[
                repositoryPath
            ];

            const repository =
                require(
                    "../src/v2/repositories/DashboardRepository"
                );

            assert.deepEqual(
                repository
                    .getPlayableProxyReferences(
                        "guild",
                        "Iño"
                    ),
                [
                    {
                        character_id:
                            "character",
                        continuity_id:
                            "continuity"
                    }
                ]
            );
        } finally {
            isolated.cleanup();
        }
    }
);
