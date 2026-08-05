const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

const {
    createIsolatedDatabase,
    withMutedConsole
} = require("./helpers/isolatedDatabase");

test(
    "la limite bloque seulement les PJ lorsque le seuil glissant est atteint",
    () => {
        stubModule(
            "src/v2/managers/GuildSettingsV2Manager.js",
            {
                getPlayedCharacterCreationLimit: () => ({
                    enabled: true,
                    limitCount: 2,
                    windowDays: 7
                })
            }
        );
        stubModule(
            "src/v2/repositories/CharacterRepository.js",
            {
                getPlayedCreationDatesForGuildSince:
                    () => [
                        {
                            created_at:
                                "2026-08-01T12:00:00.000Z"
                        },
                        {
                            created_at:
                                "2026-08-03T12:00:00.000Z"
                        }
                    ]
            }
        );

        const servicePath = require.resolve(
            "../src/v2/services/character/PlayedCharacterCreationLimitService"
        );
        delete require.cache[servicePath];
        const service = require(servicePath);

        assert.throws(
            () => service.assertCanCreate({
                guildId: "guild",
                discordUserId: "user",
                characterType: "personnage_joue",
                now: new Date(
                    "2026-08-05T12:00:00.000Z"
                )
            }),
            error => {
                assert.match(
                    error.message,
                    /limite de 2 PJ sur 7 jour/
                );
                assert.match(
                    error.message,
                    /<t:.*:R>/
                );
                return true;
            }
        );

        assert.doesNotThrow(
            () => service.assertCanCreate({
                guildId: "guild",
                discordUserId: "user",
                characterType: "pnj",
                now: new Date(
                    "2026-08-05T12:00:00.000Z"
                )
            })
        );
    }
);

test(
    "une limite désactivée ne consulte pas l'historique des créations",
    () => {
        let queryCount = 0;

        stubModule(
            "src/v2/managers/GuildSettingsV2Manager.js",
            {
                getPlayedCharacterCreationLimit: () => ({
                    enabled: false,
                    limitCount: 2,
                    windowDays: 7
                })
            }
        );
        stubModule(
            "src/v2/repositories/CharacterRepository.js",
            {
                getPlayedCreationDatesForGuildSince: () => {
                    queryCount += 1;
                    return [];
                }
            }
        );

        const servicePath = require.resolve(
            "../src/v2/services/character/PlayedCharacterCreationLimitService"
        );
        delete require.cache[servicePath];
        const service = require(servicePath);

        service.assertCanCreate({
            guildId: "guild",
            discordUserId: "user",
            characterType: "personnage_joue"
        });

        assert.equal(queryCount, 0);
    }
);

test(
    "la configuration de limite est conservée séparément pour chaque serveur",
    async () => {
        const isolated =
            createIsolatedDatabase();

        try {
            await withMutedConsole(() =>
                require(
                    "../src/database/schema"
                ).initializeDatabase()
            );

            isolated.database.prepare(`
                INSERT INTO Guilds (
                    id,
                    name,
                    created_at
                ) VALUES (?, ?, ?)
            `).run(
                "guild-a",
                "Serveur A",
                new Date().toISOString()
            );

            const managerPath = require.resolve(
                "../src/v2/managers/GuildSettingsV2Manager"
            );
            const repositoryPath = require.resolve(
                "../src/v2/repositories/GuildSettingsRepository"
            );
            delete require.cache[managerPath];
            delete require.cache[repositoryPath];
            const manager = require(managerPath);

            manager.configurePlayedCharacterCreationLimit(
                "guild-a",
                {
                    enabled: true,
                    limitCount: 3,
                    windowDays: 10
                }
            );

            assert.deepEqual(
                manager.getPlayedCharacterCreationLimit(
                    "guild-a"
                ),
                {
                    enabled: true,
                    limitCount: 3,
                    windowDays: 10
                }
            );
            assert.deepEqual(
                manager.getPlayedCharacterCreationLimit(
                    "guild-b"
                ),
                {
                    enabled: false,
                    limitCount: 2,
                    windowDays: 7
                }
            );
        } finally {
            isolated.cleanup();
        }
    }
);
