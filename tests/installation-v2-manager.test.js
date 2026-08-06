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
    "le gestionnaire conserve les règles d’installation après la séparation SQL",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createInstallationTables(
                isolated.database
            );

            const manager =
                loadManager();

            const first =
                manager.createDraft({
                    continuityId:
                        "continuity",
                    guildId:
                        "guild-a"
                });

            const duplicate =
                manager.createDraft({
                    continuityId:
                        "continuity",
                    guildId:
                        "guild-a"
                });

            assert.equal(
                duplicate.id,
                first.id
            );

            assert.deepEqual(
                manager
                    .getEffectiveAvatar(
                        first.id
                    ),
                {
                    avatar_url:
                        "https://image.test/global.png",
                    local_avatar_url:
                        null,
                    global_avatar_url:
                        "https://image.test/global.png"
                }
            );

            manager.updateStatus(
                first.id,
                {
                    status:
                        "rejected",
                    proxyEnabled:
                        false,
                    rejectionReason:
                        "Profil incomplet"
                }
            );

            const corrected =
                manager.setLocalAvatar(
                    first.id,
                    "  https://image.test/local.png  "
                );

            assert.equal(
                corrected.status,
                "draft"
            );
            assert.equal(
                corrected
                    .local_avatar_url,
                "https://image.test/local.png"
            );
            assert.equal(
                corrected
                    .rejection_reason,
                null
            );

            manager.create({
                characterId:
                    "character",
                continuityId:
                    "continuity",
                guildId:
                    "guild-b",
                status:
                    "rejected",
                rejectionReason:
                    "À corriger"
            });

            manager.create({
                characterId:
                    "character",
                continuityId:
                    "continuity",
                guildId:
                    "guild-c",
                status:
                    "approved",
                proxyEnabled:
                    true
            });

            manager.setStatus(
                first.id,
                "rejected"
            );

            const synchronization =
                manager
                    .handleContinuityUpdated(
                        "continuity"
                    );

            assert.equal(
                synchronization.total,
                3
            );
            assert.equal(
                synchronization.reset,
                2
            );
            assert.deepEqual(
                synchronization
                    .installations
                    .map(
                        installation =>
                            installation.status
                    ),
                [
                    "draft",
                    "draft",
                    "approved"
                ]
            );

            assert.throws(
                () =>
                    manager.setStatus(
                        first.id,
                        "unknown"
                    ),
                /Statut d’installation invalide/
            );

            assert.equal(
                manager
                    .getByGuild(
                        "guild-c"
                    )[0]
                    .proxy_name,
                "Alba"
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "le gestionnaire d’installations ne contient plus de requête SQL",
    () => {
        const source =
            fs.readFileSync(
                "src/v2/managers/InstallationV2Manager.js",
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
            /InstallationRepository/
        );
    }
);

test(
    "une installation annulée peut être recréée comme un nouveau brouillon",
    () => {
        const isolated = createIsolatedDatabase();

        try {
            createInstallationTables(
                isolated.database
            );
            const manager = loadManager();
            const cancelled = manager.createDraft({
                continuityId: "continuity",
                guildId: "guild-a"
            });

            manager.setStatus(
                cancelled.id,
                "archived"
            );

            assert.equal(
                manager.getByContinuityAndGuild(
                    "continuity",
                    "guild-a"
                ),
                undefined
            );

            const reinstalled = manager.createDraft({
                continuityId: "continuity",
                guildId: "guild-a"
            });

            assert.notEqual(
                reinstalled.id,
                cancelled.id
            );
            assert.equal(
                reinstalled.status,
                "draft"
            );
        } finally {
            isolated.cleanup();
        }
    }
);

function createInstallationTables(
    database
) {
    database.exec(`
        CREATE TABLE CharactersV2 (
            id TEXT
                PRIMARY KEY,
            proxy_name TEXT
                NOT NULL,
            avatar_url TEXT
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL,
            name TEXT
                NOT NULL
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
            UNIQUE(
                continuity_id,
                guild_id
            )
        );

        INSERT INTO CharactersV2 (
            id,
            proxy_name,
            avatar_url
        )
        VALUES (
            'character',
            'Alba',
            'https://image.test/global.png'
        );

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id,
            name
        )
        VALUES (
            'continuity',
            'character',
            'GreyOS'
        );
    `);
}

function loadManager() {
    const repositoryPath =
        require.resolve(
            "../src/v2/repositories/InstallationRepository"
        );

    const managerPath =
        require.resolve(
            "../src/v2/managers/InstallationV2Manager"
        );

    delete require.cache[
        repositoryPath
    ];
    delete require.cache[
        managerPath
    ];

    return require(
        "../src/v2/managers/InstallationV2Manager"
    );
}
