const fs =
    require("node:fs");
const path =
    require("node:path");
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
    "les types d’état V2 sont isolés par serveur et comptent les usages V1/V2",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createStateTables(
                isolated.database
            );

            const manager =
                loadManager();

            const custom =
                manager
                    .createStateType({
                        guildId:
                            "guild-a",
                        name:
                            "Disponible",
                        emoji:
                            "🟢",
                        createdBy:
                            "staff"
                    });

            assert.throws(
                () =>
                    manager
                        .createStateType({
                            guildId:
                                "guild-a",
                            name:
                                "disponible",
                            createdBy:
                                "staff"
                        }),
                /existe déjà/
            );

            manager
                .createStateType({
                    guildId:
                        "guild-b",
                    name:
                        "Disponible",
                    createdBy:
                        "staff"
                });

            const firstDefaults =
                manager
                    .installDefaultStateTypes(
                        "guild-a",
                        "staff"
                    );

            const secondDefaults =
                manager
                    .installDefaultStateTypes(
                        "guild-a",
                        "staff"
                    );

            assert.equal(
                firstDefaults.length,
                secondDefaults.length
            );
            assert.equal(
                manager
                    .getStateTypesByGuild(
                        "guild-b"
                    )
                    .length,
                1
            );

            isolated.database
                .prepare(`
                    INSERT INTO CharacterStates (
                        guild_id,
                        state_type_id
                    )
                    VALUES (?, ?)
                `)
                .run(
                    "guild-a",
                    custom.id
                );

            isolated.database
                .prepare(`
                    INSERT INTO ContinuityStatesV2 (
                        state_type_id
                    )
                    VALUES (?)
                `)
                .run(
                    custom.id
                );

            assert.equal(
                manager
                    .countStatesUsingType(
                        "guild-a",
                        custom.id
                    ),
                2
            );

            manager.deleteStateType(
                "guild-a",
                custom.id
            );

            assert.equal(
                isolated.database
                    .prepare(`
                        SELECT COUNT(*) AS total
                        FROM CharacterStates
                    `)
                    .get()
                    .total,
                0
            );

            assert.equal(
                isolated.database
                    .prepare(`
                        SELECT COUNT(*) AS total
                        FROM ContinuityStatesV2
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

test(
    "le parcours des états V2 ne recharge plus le gestionnaire historique",
    () => {
        const v2Root =
            path.resolve(
                "src/v2"
            );

        const files =
            listJavaScriptFiles(
                v2Root
            );

        const offenders =
            files.filter(
                file =>
                    fs.readFileSync(
                        file,
                        "utf8"
                    )
                        .includes(
                            "managers/StateManager"
                        )
            );

        assert.deepEqual(
            offenders,
            []
        );
    }
);

function createStateTables(
    database
) {
    database.pragma(
        "foreign_keys = ON"
    );

    database.exec(`
        CREATE TABLE StateTypes (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT
                NOT NULL,
            name TEXT
                NOT NULL,
            emoji TEXT,
            color TEXT,
            created_by TEXT
                NOT NULL,
            created_at TEXT
                NOT NULL,
            UNIQUE(
                guild_id,
                name
            )
        );

        CREATE TABLE CharacterStates (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT
                NOT NULL,
            state_type_id INTEGER
                NOT NULL,
            FOREIGN KEY(
                state_type_id
            )
                REFERENCES StateTypes(id)
                ON DELETE CASCADE
        );

        CREATE TABLE ContinuityStatesV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            state_type_id INTEGER
                NOT NULL,
            FOREIGN KEY(
                state_type_id
            )
                REFERENCES StateTypes(id)
                ON DELETE CASCADE
        );
    `);
}

function loadManager() {
    const repositoryPath =
        require.resolve(
            "../src/v2/repositories/StateTypeRepository"
        );

    const managerPath =
        require.resolve(
            "../src/v2/managers/StateTypeV2Manager"
        );

    delete require.cache[
        repositoryPath
    ];
    delete require.cache[
        managerPath
    ];

    return require(
        "../src/v2/managers/StateTypeV2Manager"
    );
}

function listJavaScriptFiles(
    directory
) {
    return fs.readdirSync(
        directory,
        {
            withFileTypes:
                true
        }
    ).flatMap(
        entry => {
            const entryPath =
                path.join(
                    directory,
                    entry.name
                );

            if (entry.isDirectory()) {
                return listJavaScriptFiles(
                    entryPath
                );
            }

            return entry.isFile()
                && entry.name
                    .endsWith(
                        ".js"
                    )
                ? [
                    entryPath
                ]
                : [];
        }
    );
}
