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
    "le roster staff liste, archive, restaure et supprime les personnages d’un utilisateur",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createTables(isolated.database);

            const manager =
                loadManager();

            seedCharacters(isolated.database);

            assert.deepEqual(
                manager.getRoster("guild")
                    .map(character =>
                        character.firstname
                    ),
                [
                    "La Louve",
                    "Vega"
                ]
            );

            const archived =
                manager.archiveOwnerCharacters(
                    "guild",
                    "owner"
                );

            assert.equal(
                archived.updated.length,
                2
            );

            assert.deepEqual(
                manager.getRoster("guild"),
                []
            );

            assert.deepEqual(
                manager.getRoster(
                    "guild",
                    { includeArchived: true }
                ).map(character =>
                    character.firstname
                ),
                [
                    "La Louve",
                    "Vega"
                ]
            );

            const restored =
                manager.restoreOwnerCharacters(
                    "guild",
                    "owner"
                );

            assert.equal(
                restored.updated.length,
                2
            );

            const deleted =
                manager.deleteOwnerCharacters(
                    "guild",
                    "owner"
                );

            assert.equal(
                deleted.deleted.length,
                2
            );

            assert.equal(
                isolated.database.prepare(`
                    SELECT COUNT(*) AS total
                    FROM CharactersV2
                `).get().total,
                0
            );
        } finally {
            isolated.cleanup();
        }
    }
);

function loadManager() {
    for (
        const modulePath of [
            "../src/v2/repositories/CharacterRepository",
            "../src/v2/managers/CharacterV2Manager",
            "../src/v2/repositories/CharacterRosterRepository",
            "../src/v2/managers/CharacterRosterV2Manager"
        ]
    ) {
        delete require.cache[
            require.resolve(modulePath)
        ];
    }

    return require(
        "../src/v2/managers/CharacterRosterV2Manager"
    );
}

function createTables(db) {
    db.exec(`
        CREATE TABLE UsersV2 (
            id INTEGER PRIMARY KEY,
            discord_user_id TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE CharactersV2 (
            id TEXT PRIMARY KEY,
            owner_user_id INTEGER NOT NULL,
            proxy_name TEXT NOT NULL,
            avatar_url TEXT,
            base_firstname TEXT,
            base_lastname TEXT,
            character_type TEXT NOT NULL,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT PRIMARY KEY,
            character_id TEXT NOT NULL,
            name TEXT NOT NULL,
            firstname TEXT,
            lastname TEXT,
            age INTEGER,
            gang TEXT,
            story TEXT,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE CharacterProfilesV2 (
            continuity_id TEXT PRIMARY KEY,
            firstname TEXT,
            alias TEXT,
            gender TEXT
        );

        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER PRIMARY KEY,
            character_id TEXT NOT NULL,
            continuity_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            status TEXT NOT NULL
        );

        CREATE TABLE MigrationV1ToV2 (
            entity_type TEXT,
            old_id TEXT,
            new_id TEXT
        );
    `);
}

function seedCharacters(db) {
    db.prepare(`
        INSERT INTO UsersV2 VALUES (1, 'owner', 'now', 'now')
    `).run();

    const characters = [
        ["alba", "Alba", "personnage_joue"],
        ["vega", "Vega", "random"]
    ];

    for (const [id, firstname, type] of characters) {
        db.prepare(`
            INSERT INTO CharactersV2 VALUES (?, 1, ?, NULL, ?, NULL, ?, 0, 'now', 'now')
        `).run(
            id,
            firstname,
            firstname,
            type
        );

        db.prepare(`
            INSERT INTO CharacterContinuitiesV2 VALUES (?, ?, 'GreyOS', ?, NULL, NULL, NULL, NULL, 0, 'now', 'now')
        `).run(
            `continuity-${id}`,
            id,
            firstname
        );

        db.prepare(`
            INSERT INTO CharacterProfilesV2 VALUES (?, ?, ?, NULL)
        `).run(
            `continuity-${id}`,
            firstname,
            id === "alba"
                ? "La Louve"
                : null
        );

        db.prepare(`
            INSERT INTO CharacterGuildInstallationsV2 VALUES (NULL, ?, ?, 'guild', 'approved')
        `).run(
            id,
            `continuity-${id}`
        );
    }
}
