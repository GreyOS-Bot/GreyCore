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
    "personnages et continuités conservent leurs règles après la séparation SQL",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createCoreTables(
                isolated.database
            );

            const {
                characterManager,
                continuityManager,
                installationManager
            } = loadManagers();

            const character =
                characterManager.create({
                    id:
                        "character",
                    ownerUserId:
                        "user",
                    proxyName:
                        "  Alba  ",
                    avatarUrl:
                        "https://image.test/alba.png"
                });

            assert.equal(
                character.proxy_name,
                "Alba"
            );

            assert.throws(
                () =>
                    characterManager
                        .create({
                            id:
                                "duplicate",
                            ownerUserId:
                                "user",
                            proxyName:
                                "alba"
                        }),
                /existe déjà/
            );

            assert.throws(
                () =>
                    characterManager
                        .updateIdentity(
                            character.id,
                            {
                                proxyName:
                                    "   "
                            }
                        ),
                /nom du personnage est obligatoire/
            );

            const continuity =
                continuityManager
                    .create({
                        id:
                            "continuity",
                        characterId:
                            character.id,
                        name:
                            "  GreyOS  ",
                        firstname:
                            "Alba"
                    });

            assert.equal(
                continuity.name,
                "GreyOS"
            );

            assert.throws(
                () =>
                    continuityManager
                        .create({
                            id:
                                "duplicate-continuity",
                            characterId:
                                character.id,
                            name:
                                "greyos"
                        }),
                /existe déjà/
            );

            const installation =
                installationManager
                    .createDraft({
                        continuityId:
                            continuity.id,
                        guildId:
                            "guild-a"
                    });

            installationManager
                .updateStatus(
                    installation.id,
                    {
                        status:
                            "rejected",
                        rejectionReason:
                            "Récit incomplet"
                    }
                );

            continuityManager
                .updateProfile(
                    continuity.id,
                    {
                        story:
                            "Nouveau récit"
                    }
                );

            assert.equal(
                installationManager
                    .getById(
                        installation.id
                    )
                    .status,
                "draft"
            );

            installationManager
                .updateStatus(
                    installation.id,
                    {
                        status:
                            "rejected",
                        rejectionReason:
                            "Autre correction"
                    }
                );

            continuityManager
                .updateProfile(
                    continuity.id,
                    {
                        story:
                            "Nouveau récit"
                    }
                );

            assert.equal(
                installationManager
                    .getById(
                        installation.id
                    )
                    .status,
                "rejected"
            );

            addMigrationMappings(
                isolated.database,
                {
                    characterId:
                        character.id,
                    continuityId:
                        continuity.id,
                    installationId:
                        installation.id
                }
            );

            const deletion =
                continuityManager
                    .delete(
                        continuity.id
                    );

            assert.equal(
                deletion
                    .installationCount,
                1
            );
            assert.equal(
                characterManager
                    .getById(
                        character.id
                    )
                    .id,
                character.id
            );
            assert.equal(
                countRows(
                    isolated.database,
                    "MigrationV1ToV2"
                ),
                1
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "la suppression globale reste transactionnelle et nettoie les correspondances",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createCoreTables(
                isolated.database
            );

            const {
                characterManager,
                continuityManager,
                installationManager
            } = loadManagers();

            const character =
                characterManager.create({
                    id:
                        "character-delete",
                    ownerUserId:
                        "user",
                    proxyName:
                        "Nova"
                });

            const firstContinuity =
                continuityManager
                    .create({
                        id:
                            "continuity-a",
                        characterId:
                            character.id,
                        name:
                            "Vie A"
                    });

            const secondContinuity =
                continuityManager
                    .create({
                        id:
                            "continuity-b",
                        characterId:
                            character.id,
                        name:
                            "Vie B"
                    });

            const firstInstallation =
                installationManager
                    .createDraft({
                        continuityId:
                            firstContinuity.id,
                        guildId:
                            "guild-a"
                    });

            const secondInstallation =
                installationManager
                    .createDraft({
                        continuityId:
                            secondContinuity.id,
                        guildId:
                            "guild-b"
                    });

            addMigrationMappings(
                isolated.database,
                {
                    characterId:
                        character.id,
                    continuityId:
                        firstContinuity.id,
                    installationId:
                        firstInstallation.id
                }
            );

            insertMapping(
                isolated.database,
                "continuity",
                "old-continuity-b",
                secondContinuity.id
            );

            insertMapping(
                isolated.database,
                "installation",
                "old-installation-b",
                String(
                    secondInstallation.id
                )
            );

            const deletion =
                characterManager
                    .delete(
                        character.id
                    );

            assert.equal(
                deletion
                    .continuityCount,
                2
            );
            assert.equal(
                deletion
                    .installationCount,
                2
            );
            assert.equal(
                countRows(
                    isolated.database,
                    "CharactersV2"
                ),
                0
            );
            assert.equal(
                countRows(
                    isolated.database,
                    "CharacterContinuitiesV2"
                ),
                0
            );
            assert.equal(
                countRows(
                    isolated.database,
                    "CharacterGuildInstallationsV2"
                ),
                0
            );
            assert.equal(
                countRows(
                    isolated.database,
                    "MigrationV1ToV2"
                ),
                0
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les gestionnaires Personnage et Continuité ne contiennent plus de SQL",
    () => {
        for (
            const file
            of [
                "src/v2/managers/CharacterV2Manager.js",
                "src/v2/managers/ContinuityV2Manager.js"
            ]
        ) {
            const source =
                fs.readFileSync(
                    file,
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
                /Repository/
            );
        }
    }
);

function createCoreTables(
    database
) {
    database.pragma(
        "foreign_keys = ON"
    );

    database.exec(`
        CREATE TABLE UsersV2 (
            id TEXT
                PRIMARY KEY,
            discord_user_id TEXT
                NOT NULL
        );

        CREATE TABLE CharactersV2 (
            id TEXT
                PRIMARY KEY,
            owner_user_id TEXT
                NOT NULL,
            proxy_name TEXT
                NOT NULL,
            avatar_url TEXT,
            base_firstname TEXT,
            base_lastname TEXT,
            character_type TEXT,
            is_archived INTEGER
                NOT NULL DEFAULT 0,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL,
            FOREIGN KEY(
                owner_user_id
            )
                REFERENCES UsersV2(id)
                ON DELETE CASCADE,
            UNIQUE(
                owner_user_id,
                proxy_name
            )
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL,
            name TEXT
                NOT NULL,
            mode TEXT,
            source_continuity_id TEXT,
            firstname TEXT,
            lastname TEXT,
            age INTEGER,
            gang TEXT,
            story TEXT,
            is_archived INTEGER
                NOT NULL DEFAULT 0,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL,
            FOREIGN KEY(
                character_id
            )
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,
            UNIQUE(
                character_id,
                name
            )
        );

        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            character_id TEXT
                NOT NULL,
            continuity_id TEXT
                NOT NULL,
            guild_id TEXT
                NOT NULL,
            status TEXT
                NOT NULL DEFAULT 'draft',
            visibility TEXT
                NOT NULL DEFAULT 'private',
            proxy_enabled INTEGER
                NOT NULL DEFAULT 0,
            local_avatar_url TEXT,
            validated_by TEXT,
            validated_at TEXT,
            rejection_reason TEXT,
            installed_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL,
            last_activity_at TEXT,
            FOREIGN KEY(
                character_id
            )
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,
            FOREIGN KEY(
                continuity_id
            )
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,
            UNIQUE(
                continuity_id,
                guild_id
            )
        );

        CREATE TABLE MigrationV1ToV2 (
            entity_type TEXT
                NOT NULL,
            old_id TEXT
                NOT NULL,
            new_id TEXT
                NOT NULL,
            migrated_at TEXT
                NOT NULL,
            PRIMARY KEY(
                entity_type,
                old_id
            )
        );

        INSERT INTO UsersV2 (
            id,
            discord_user_id
        )
        VALUES (
            'user',
            'discord-owner'
        );
    `);
}

function loadManagers() {
    const modules = [
        "../src/v2/repositories/CharacterRepository",
        "../src/v2/repositories/ContinuityRepository",
        "../src/v2/repositories/InstallationRepository",
        "../src/v2/managers/CharacterV2Manager",
        "../src/v2/managers/ContinuityV2Manager",
        "../src/v2/managers/InstallationV2Manager"
    ];

    for (
        const modulePath
        of modules
    ) {
        delete require.cache[
            require.resolve(
                modulePath
            )
        ];
    }

    return {
        characterManager:
            require(
                "../src/v2/managers/CharacterV2Manager"
            ),
        continuityManager:
            require(
                "../src/v2/managers/ContinuityV2Manager"
            ),
        installationManager:
            require(
                "../src/v2/managers/InstallationV2Manager"
            )
    };
}

function addMigrationMappings(
    database,
    {
        characterId,
        continuityId,
        installationId
    }
) {
    insertMapping(
        database,
        "character",
        "old-character",
        characterId
    );

    insertMapping(
        database,
        "continuity",
        "old-continuity",
        continuityId
    );

    insertMapping(
        database,
        "installation",
        "old-installation",
        String(
            installationId
        )
    );
}

function insertMapping(
    database,
    entityType,
    oldId,
    newId
) {
    database.prepare(`
        INSERT INTO MigrationV1ToV2 (
            entity_type,
            old_id,
            new_id,
            migrated_at
        )
        VALUES (?, ?, ?, ?)
    `).run(
        entityType,
        oldId,
        newId,
        new Date()
            .toISOString()
    );
}

function countRows(
    database,
    table
) {
    return database
        .prepare(
            `SELECT COUNT(*) AS total FROM ${table}`
        )
        .get()
        .total;
}
