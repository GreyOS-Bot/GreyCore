const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "la base supprime uniquement l’installation ciblée et son suivi",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            isolated.database
                .pragma(
                    "foreign_keys = ON"
                );

            isolated.database.exec(`
                CREATE TABLE
                    CharacterGuildInstallationsV2 (
                        id INTEGER
                            PRIMARY KEY,
                        continuity_id TEXT
                            NOT NULL,
                        guild_id TEXT
                            NOT NULL
                    );

                CREATE TABLE
                    CharacterInstallationMessagesV2 (
                        installation_id INTEGER
                            PRIMARY KEY,
                        message_id TEXT
                            NOT NULL,
                        FOREIGN KEY(
                            installation_id
                        )
                            REFERENCES
                                CharacterGuildInstallationsV2(id)
                            ON DELETE CASCADE
                    );
            `);

            isolated.database
                .prepare(`
                    INSERT INTO
                        CharacterGuildInstallationsV2 (
                            id,
                            continuity_id,
                            guild_id
                        )
                    VALUES (?, ?, ?)
                `)
                .run(
                    1,
                    "continuity",
                    "guild-a"
                );

            isolated.database
                .prepare(`
                    INSERT INTO
                        CharacterGuildInstallationsV2 (
                            id,
                            continuity_id,
                            guild_id
                        )
                    VALUES (?, ?, ?)
                `)
                .run(
                    2,
                    "continuity",
                    "guild-b"
                );

            isolated.database
                .prepare(`
                    INSERT INTO
                        CharacterInstallationMessagesV2 (
                            installation_id,
                            message_id
                        )
                    VALUES (?, ?)
                `)
                .run(
                    1,
                    "message"
                );

            const manager =
                require(
                    "../src/v2/managers/InstallationV2Manager"
                );

            manager.delete(
                1
            );

            assert.deepEqual(
                isolated.database
                    .prepare(`
                        SELECT id
                        FROM
                            CharacterGuildInstallationsV2
                        ORDER BY id
                    `)
                    .all(),
                [
                    {
                        id:
                            2
                    }
                ]
            );

            assert.equal(
                isolated.database
                    .prepare(`
                        SELECT COUNT(*) AS total
                        FROM
                            CharacterInstallationMessagesV2
                    `)
                    .get()
                    .total,
                0
            );
        } finally {
            isolated.cleanup();
        }
    }
);
