const fs =
    require("node:fs");
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
    "le gestionnaire Rencontres conserve création, ordre, modification et suppression",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createEncounterTables(
                isolated.database
            );

            const manager =
                loadManager();

            const linked =
                manager.create({
                    continuityAId:
                        "continuity-a",
                    continuityBId:
                        "continuity-b",
                    occurredAt:
                        "2026-01-02",
                    location:
                        "  Los Santos  ",
                    createdBy:
                        "owner"
                });

            const external =
                manager.create({
                    continuityAId:
                        "continuity-a",
                    externalName:
                        "  Morgan  ",
                    occurredAt:
                        "2026-03-04",
                    createdBy:
                        "owner"
                });

            const encounters =
                manager
                    .getForContinuity(
                        "continuity-a"
                    );

            assert.deepEqual(
                encounters.map(
                    encounter =>
                        encounter.id
                ),
                [
                    external.id,
                    linked.id
                ]
            );

            const linkedDisplay =
                encounters.find(
                    encounter =>
                        encounter.id ===
                        linked.id
                );

            assert.equal(
                linkedDisplay
                    .other_continuity_id,
                "continuity-b"
            );
            assert.equal(
                linkedDisplay
                    .other_character_name,
                "Beth"
            );

            const updated =
                manager.update(
                    external.id,
                    {
                        externalName:
                            "Morgan Lee",
                        note:
                            "  Première rencontre  ",
                        occurredAt:
                            "2026-04-05"
                    }
                );

            assert.equal(
                updated.external_name,
                "Morgan Lee"
            );
            assert.equal(
                updated.note,
                "Première rencontre"
            );

            assert.throws(
                () =>
                    manager.update(
                        external.id,
                        {
                            externalName:
                                " "
                        }
                    ),
                /personnage rencontré est obligatoire/
            );

            assert.throws(
                () =>
                    manager.create({
                        continuityAId:
                            "continuity-a",
                        continuityBId:
                            "continuity-a",
                        createdBy:
                            "owner"
                    }),
                /elle-même/
            );

            assert.throws(
                () =>
                    manager.create({
                        continuityAId:
                            "continuity-a",
                        externalName:
                            "Jamie",
                        occurredAt:
                            "2026-02-30",
                        createdBy:
                            "owner"
                    }),
                /date de la rencontre est invalide/
            );

            assert.equal(
                manager.delete(
                    linked.id
                ).id,
                linked.id
            );
            assert.equal(
                manager.getById(
                    linked.id
                ),
                undefined
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "le gestionnaire Rencontres ne contient plus de requête SQL",
    () => {
        const source =
            fs.readFileSync(
                "src/v2/managers/EncounterV2Manager.js",
                "utf8"
            );

        assert.doesNotMatch(
            source,
            /\.prepare\s*\(/
        );
        assert.doesNotMatch(
            source,
            /database\/database/
        );
        assert.match(
            source,
            /EncounterRepository/
        );
    }
);

function createEncounterTables(
    database
) {
    database.exec(`
        CREATE TABLE CharactersV2 (
            id TEXT
                PRIMARY KEY,
            proxy_name TEXT
                NOT NULL
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL
        );

        CREATE TABLE CharacterProfilesV2 (
            continuity_id TEXT
                PRIMARY KEY,
            firstname TEXT,
            lastname TEXT
        );

        CREATE TABLE ContinuityEncountersV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            continuity_a_id TEXT
                NOT NULL,
            continuity_b_id TEXT,
            external_name TEXT,
            location TEXT,
            note TEXT,
            occurred_at TEXT
                NOT NULL,
            created_by TEXT
                NOT NULL,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        INSERT INTO CharactersV2 (
            id,
            proxy_name
        )
        VALUES
            ('character-a', 'Alba'),
            ('character-b', 'Beth');

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id
        )
        VALUES
            ('continuity-a', 'character-a'),
            ('continuity-b', 'character-b');

        INSERT INTO CharacterProfilesV2 (
            continuity_id,
            firstname,
            lastname
        )
        VALUES
            ('continuity-a', 'Alba', 'Grey'),
            ('continuity-b', 'Beth', 'Stone');
    `);
}

function loadManager() {
    const repositoryPath =
        require.resolve(
            "../src/v2/repositories/EncounterRepository"
        );

    const managerPath =
        require.resolve(
            "../src/v2/managers/EncounterV2Manager"
        );

    delete require.cache[
        repositoryPath
    ];
    delete require.cache[
        managerPath
    ];

    return require(
        "../src/v2/managers/EncounterV2Manager"
    );
}
