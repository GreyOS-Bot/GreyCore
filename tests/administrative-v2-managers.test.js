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
    "les utilisateurs et réglages serveur conservent leurs contrats",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createAdministrativeTables(
                isolated.database
            );

            const userManager =
                loadManager(
                    "User"
                );
            const settingsManager =
                loadManager(
                    "GuildSettings"
                );

            const user =
                userManager
                    .getOrCreate(
                        "discord-a"
                    );

            assert.equal(
                user.discord_user_id,
                "discord-a"
            );
            assert.equal(
                userManager
                    .getOrCreate(
                        "discord-a"
                    )
                    .id,
                user.id
            );
            assert.equal(
                userManager
                    .touch(
                        user.id
                    )
                    .id,
                user.id
            );

            const initialSettings =
                settingsManager
                    .ensure(
                        "guild-a"
                    );

            assert.equal(
                initialSettings
                    .validation_channel_id,
                null
            );
            assert.equal(
                initialSettings
                    .error_log_channel_id,
                null
            );
            assert.equal(
                settingsManager
                    .setValidationChannel(
                        "guild-a",
                        "channel-a"
                    )
                    .validation_channel_id,
                "channel-a"
            );
            assert.equal(
                settingsManager
                    .getValidationChannelId(
                        "guild-a"
                ),
                "channel-a"
            );
            assert.equal(
                settingsManager
                    .setErrorLogChannel(
                        "guild-a",
                        "errors-a"
                    )
                    .error_log_channel_id,
                "errors-a"
            );
            assert.equal(
                settingsManager
                    .getErrorLogChannelId(
                        "guild-a"
                    ),
                "errors-a"
            );
            assert.equal(
                settingsManager
                    .removeValidationChannel(
                        "guild-a"
                    )
                    .validation_channel_id,
                null
            );
            assert.equal(
                settingsManager
                    .removeErrorLogChannel(
                        "guild-a"
                    )
                    .error_log_channel_id,
                null
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les modules serveur restent idempotents et configurables",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createAdministrativeTables(
                isolated.database
            );

            const manager =
                loadManager(
                    "GuildModule"
                );

            const defaults =
                manager.ensureDefaults(
                    "guild-a"
                );

            assert.equal(
                defaults.length,
                7
            );
            assert.deepEqual(
                defaults.map(
                    module =>
                        module.module_key
                ),
                [
                    "assets",
                    "encounters",
                    "journal",
                    "outfit",
                    "phone",
                    "relationships",
                    "states"
                ]
            );
            assert.equal(
                manager
                    .ensureDefaults(
                        "guild-a"
                    )
                    .length,
                7
            );
            assert.equal(
                manager.isEnabled(
                    "guild-a",
                    "phone"
                ),
                true
            );

            assert.equal(
                manager.getConfiguration(
                    "guild-a"
                ).find(
                    module => module.key === "assets"
                ).isEnabled,
                true
            );

            const disabled =
                manager.setEnabled(
                    "guild-a",
                    "phone",
                    false
                );

            assert.equal(
                disabled.is_enabled,
                0
            );
            assert.equal(
                manager.isEnabled(
                    "guild-a",
                    "phone"
                ),
                false
            );

            assert.equal(
                manager.getConfiguration(
                    "guild-a"
                ).find(
                    module => module.key === "phone"
                ).isEnabled,
                false
            );
            assert.equal(
                manager.isEnabled(
                    "guild-a",
                    "missing"
                ),
                false
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "le suivi du message staff reste unique par installation",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createAdministrativeTables(
                isolated.database
            );

            const manager =
                loadManager(
                    "InstallationMessage"
                );

            const first =
                manager.save({
                    installationId:
                        10,
                    guildId:
                        "guild-a",
                    channelId:
                        "channel-a",
                    messageId:
                        "message-a",
                    createdAt:
                        "2026-01-01T00:00:00.000Z",
                    updatedAt:
                        "2026-01-01T00:00:00.000Z"
                });

            assert.equal(
                first.message_id,
                "message-a"
            );

            const updated =
                manager.save({
                    installationId:
                        10,
                    guildId:
                        "guild-a",
                    channelId:
                        "channel-b",
                    messageId:
                        "message-b",
                    createdAt:
                        "2026-02-01T00:00:00.000Z",
                    updatedAt:
                        "2026-02-01T00:00:00.000Z"
                });

            assert.equal(
                updated.channel_id,
                "channel-b"
            );
            assert.equal(
                updated.message_id,
                "message-b"
            );
            assert.equal(
                updated.created_at,
                "2026-01-01T00:00:00.000Z"
            );

            assert.equal(
                manager.delete(
                    10
                ).message_id,
                "message-b"
            );
            assert.equal(
                manager.delete(
                    10
                ),
                null
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les gestionnaires administratifs ne contiennent plus de requête SQL",
    () => {
        const managers = [
            "User",
            "GuildSettings",
            "GuildModule",
            "InstallationMessage"
        ];

        for (
            const name
            of managers
        ) {
            const source =
                fs.readFileSync(
                    `src/v2/managers/${name}V2Manager.js`,
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
                new RegExp(
                    `${name}Repository`
                )
            );
        }
    }
);

function createAdministrativeTables(
    database
) {
    database.exec(`
        CREATE TABLE UsersV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            discord_user_id TEXT
                NOT NULL UNIQUE,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        CREATE TABLE GuildSettingsV2 (
            guild_id TEXT
                PRIMARY KEY,
            validation_channel_id TEXT,
            error_log_channel_id TEXT,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        CREATE TABLE GuildModulesV2 (
            guild_id TEXT
                NOT NULL,
            module_key TEXT
                NOT NULL,
            is_enabled INTEGER
                NOT NULL DEFAULT 1,
            updated_at TEXT
                NOT NULL,
            PRIMARY KEY (
                guild_id,
                module_key
            )
        );

        CREATE TABLE CharacterInstallationMessagesV2 (
            installation_id INTEGER
                PRIMARY KEY,
            guild_id TEXT
                NOT NULL,
            channel_id TEXT
                NOT NULL,
            message_id TEXT
                NOT NULL,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );
    `);
}

function loadManager(
    name
) {
    clearModule(
        `../src/v2/repositories/${name}Repository`
    );
    clearModule(
        `../src/v2/managers/${name}V2Manager`
    );

    return require(
        `../src/v2/managers/${name}V2Manager`
    );
}

function clearModule(
    modulePath
) {
    const resolved =
        require.resolve(
            modulePath
        );

    delete require.cache[
        resolved
    ];
}
