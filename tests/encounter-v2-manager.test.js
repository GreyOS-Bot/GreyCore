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
                    guildId: "guild",
                    contextId: "context",
                    installationAId: 1,
                    installationBId: 2,
                    occurredAt:
                        "2026-01-02",
                    location:
                        "  Los Santos  ",
                    createdBy:
                        "owner"
                });

            const external =
                manager.create({
                    guildId: "guild",
                    contextId: "context",
                    installationAId: 1,
                    externalName:
                        "  Morgan  ",
                    occurredAt:
                        "2026-03-04",
                    createdBy:
                        "owner"
                });

            const encounters =
                manager
                    .getForInstallationInContext(1,"guild","context");

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
                manager.updateScoped(
                    external.id,
                    {installationId:1,guildId:"guild",contextId:"context",actorId:"owner"},
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
                    manager.updateScoped(
                        external.id,
                        {installationId:1,guildId:"guild",contextId:"context",actorId:"owner"},
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
                        guildId:"guild",contextId:"context",installationAId:1,installationBId:1,
                        createdBy:
                            "owner"
                    }),
                /elle-même/
            );

            assert.throws(
                () =>
                    manager.create({
                        guildId:"guild",contextId:"context",installationAId:1,
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
                manager.deleteScoped(linked.id,{installationId:1,guildId:"guild",contextId:"context",actorId:"owner"}).id,
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
            proxy_name TEXT NOT NULL,
            owner_user_id INTEGER,
            is_archived INTEGER DEFAULT 0
        );

        CREATE TABLE UsersV2(id INTEGER PRIMARY KEY,discord_user_id TEXT);
        CREATE TABLE Guilds(id TEXT PRIMARY KEY);
        CREATE TABLE Contexts(id TEXT PRIMARY KEY,guild_id TEXT,is_active INTEGER);

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

        CREATE TABLE CharacterGuildInstallationsV2(
            id INTEGER PRIMARY KEY,character_id TEXT,continuity_id TEXT,guild_id TEXT,context_id TEXT,
            status TEXT,proxy_enabled INTEGER
        );

        INSERT INTO UsersV2 VALUES(1,'owner'),(2,'other');
        INSERT INTO Guilds VALUES('guild');
        INSERT INTO Contexts VALUES('context','guild',1);
        INSERT INTO CharactersV2 (
            id,proxy_name,owner_user_id
        )
        VALUES
            ('character-a', 'Alba',1),
            ('character-b', 'Beth',2);

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
        INSERT INTO CharacterGuildInstallationsV2 VALUES
            (1,'character-a','continuity-a','guild','context','approved',1),
            (2,'character-b','continuity-b','guild','context','approved',1);
    `);
    require("../src/v2/repositories/InstallationEncounterSchema")(database);
}

function loadManager() {
    const repositoryPath =
        require.resolve(
            "../src/v2/repositories/InstallationEncounterRepository"
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
