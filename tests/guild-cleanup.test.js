const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "la suppression d’un serveur retire ses installations et ses continuités devenues orphelines",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createTables(
                isolated.database
            );
            seedData(
                isolated.database
            );

            const repositoryPath =
                require.resolve(
                    "../src/v2/repositories/GuildCleanupRepository"
                );

            delete require.cache[
                repositoryPath
            ];

            const repository =
                require(
                    "../src/v2/repositories/GuildCleanupRepository"
                );

            assert.deepEqual(
                repository.cleanupDeletedGuild(
                    "guild-a"
                ),
                {
                    guildId: "guild-a",
                    installationCount: 2,
                    continuityCount: 1
                }
            );

            assert.deepEqual(
                readIds(
                    isolated.database,
                    "CharacterGuildInstallationsV2"
                ),
                ["3", "4"]
            );

            assert.deepEqual(
                readIds(
                    isolated.database,
                    "CharacterContinuitiesV2"
                ),
                ["shared", "untouched"]
            );

            assert.deepEqual(
                readIds(
                    isolated.database,
                    "CharacterInstallationMessagesV2"
                ),
                ["3"]
            );

            assert.deepEqual(
                readValues(
                    isolated.database,
                    "MigrationV1ToV2"
                ),
                ["3", "shared"]
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "l’événement guildDelete lance le nettoyage sans faire tomber le bot",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/managers/GuildCleanupV2Manager.js",
            {
                cleanupDeletedGuild:
                    guildId => {
                        calls.push([
                            "cleanup",
                            guildId
                        ]);

                        return {
                            guildId
                        };
                    }
            }
        );

        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create: () => ({
                    info:
                        (message, result) =>
                            calls.push([
                                "info",
                                message,
                                result.guildId
                            ]),
                    error: () => {
                        throw new Error(
                            "Journal d’erreur inattendu"
                        );
                    }
                })
            }
        );

        const eventPath =
            require.resolve(
                "../src/events/guildDelete"
            );

        delete require.cache[eventPath];

        const event =
            require(
                "../src/events/guildDelete"
            );

        await event.execute({
            id: "guild-a"
        });

        assert.equal(
            event.name,
            "guildDelete"
        );

        assert.deepEqual(
            calls,
            [
                [
                    "cleanup",
                    "guild-a"
                ],
                [
                    "info",
                    "Nettoyage du serveur supprimé terminé.",
                    "guild-a"
                ]
            ]
        );
    }
);

function createTables(
    database
) {
    database.exec(`
        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT PRIMARY KEY
        );

        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER PRIMARY KEY,
            continuity_id TEXT NOT NULL,
            guild_id TEXT NOT NULL
        );

        CREATE TABLE CharacterInstallationMessagesV2 (
            installation_id INTEGER PRIMARY KEY,
            guild_id TEXT NOT NULL
        );

        CREATE TABLE MigrationV1ToV2 (
            new_id TEXT NOT NULL
        );
    `);
}

function seedData(
    database
) {
    database.exec(`
        INSERT INTO CharacterContinuitiesV2 (id)
        VALUES ('orphan'), ('shared'), ('untouched');

        INSERT INTO CharacterGuildInstallationsV2 (
            id,
            continuity_id,
            guild_id
        )
        VALUES
            (1, 'orphan', 'guild-a'),
            (2, 'shared', 'guild-a'),
            (3, 'shared', 'guild-b'),
            (4, 'untouched', 'guild-b');

        INSERT INTO CharacterInstallationMessagesV2 (
            installation_id,
            guild_id
        )
        VALUES
            (1, 'guild-a'),
            (2, 'guild-a'),
            (3, 'guild-b');

        INSERT INTO MigrationV1ToV2 (new_id)
        VALUES
            ('1'),
            ('2'),
            ('3'),
            ('orphan'),
            ('shared');
    `);
}

function readIds(
    database,
    tableName
) {
    const column =
        tableName ===
        "CharacterInstallationMessagesV2"
            ? "installation_id"
            : "id";

    return database.prepare(`
        SELECT ${column} AS id
        FROM ${tableName}
        ORDER BY ${column} ASC
    `).all().map(
        row => String(row.id)
    );
}

function readValues(
    database,
    tableName
) {
    return database.prepare(`
        SELECT new_id
        FROM ${tableName}
        ORDER BY new_id ASC
    `).all().map(
        row => row.new_id
    );
}
