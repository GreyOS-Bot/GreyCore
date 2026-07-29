const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase,
    withMutedConsole
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "le schéma est explicite, complet et idempotent",
    async context => {
        const isolated =
            createIsolatedDatabase();

        context.after(
            () => isolated.cleanup()
        );

        isolated.database.pragma(
            "foreign_keys = ON"
        );

        const schema =
            require(
                "../src/database/schema"
            );

        const tablesBeforeInitialization =
            isolated.database
                .prepare(`
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table'
                `)
                .all();

        assert.equal(
            tablesBeforeInitialization
                .length,
            0
        );

        await withMutedConsole(
            () =>
                schema
                    .initializeDatabase()
        );

        const requiredTables = [
            "Guilds",
            "Characters",
            "ProxyMessages",
            "UsersV2",
            "CharactersV2",
            "CharacterAliasesV2",
            "CharacterContinuitiesV2",
            "CharacterProfilesV2",
            "ContinuityPhonesV2",
            "PhoneCallsV2",
            "AssetTypesV2",
            "ContinuityAssetsV2",
            "ContinuityAssetTransfersV2",
            "CharacterInstallationMessagesV2",
            "CharacterChangeRequestsV2",
            "InstallationValidationHistoryV2",
            "GuildModulesV2",
            "GuildCharacterApprovalAutomationsV2",
            "GuildCharacterApprovalAutomationRunsV2"
        ];

        const tableNames =
            new Set(
                isolated.database
                    .prepare(`
                        SELECT name
                        FROM sqlite_master
                        WHERE type = 'table'
                    `)
                    .all()
                    .map(
                        row => row.name
                    )
            );

        for (
            const tableName
            of requiredTables
        ) {
            assert.equal(
                tableNames.has(
                    tableName
                ),
                true,
                tableName
            );
        }

        const phoneMessageColumns =
            new Set(
                isolated.database
                    .prepare(
                        "PRAGMA table_info(PhoneMessagesV2)"
                    )
                    .all()
                    .map(
                        column => column.name
                    )
            );

        assert.equal(
            phoneMessageColumns.has("media_url"),
            true
        );

        assert.equal(
            phoneMessageColumns.has(
                "media_content_type"
            ),
            true
        );

        const profileColumns =
            new Set(
                isolated.database
                    .prepare(
                        "PRAGMA table_info(CharacterProfilesV2)"
                    )
                    .all()
                    .map(
                        column => column.name
                    )
            );

        assert.equal(
            profileColumns.has("alias"),
            true
        );

        await withMutedConsole(
            () =>
                schema
                    .initializeDatabase()
        );

        const tableCount =
            isolated.database
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM sqlite_master
                    WHERE type = 'table'
                `)
                .get()
                .count;

        assert.equal(
            tableCount,
            tableNames.size
        );

        assert.deepEqual(
            isolated.database.pragma(
                "foreign_key_check"
            ),
            []
        );
    }
);
