const database = require(
    "../../database/database"
);

const ANONYMOUS_USER =
    "utilisateur-supprime";

class UserPrivacyRepository {

    constructor(db = database) {
        this.db = db;
    }

    getSummary(discordUserId) {
        const user = this.tableExists("UsersV2")
            ? this.db.prepare(`
                SELECT id
                FROM UsersV2
                WHERE discord_user_id = ?
            `).get(discordUserId)
            : null;

        return {
            discordUserId,
            globalCharacters:
                user
                    ? this.count(
                        "CharactersV2",
                        "owner_user_id = ?",
                        user.id
                    )
                    : 0,
            legacyCharacters:
                this.count(
                    "Characters",
                    "owner_id = ?",
                    discordUserId
                ),
            proxyMessages:
                this.count(
                    "ProxyMessages",
                    "author_id = ?",
                    discordUserId
                ),
            automationRuns:
                this.count(
                    "GuildCharacterApprovalAutomationRunsV2",
                    "discord_user_id = ?",
                    discordUserId
                )
        };
    }

    erase(discordUserId) {
        const summary =
            this.getSummary(discordUserId);

        const eraseTransaction =
            this.db.transaction(() => {
                const v2User =
                    this.tableExists("UsersV2")
                        ? this.db.prepare(`
                            SELECT id
                            FROM UsersV2
                            WHERE discord_user_id = ?
                        `).get(discordUserId)
                        : null;

                const v2CharacterIds = v2User
                    ? this.values(
                        "CharactersV2",
                        "id",
                        "owner_user_id = ?",
                        v2User.id
                    )
                    : [];

                const v2ContinuityIds =
                    this.valuesByList(
                        "CharacterContinuitiesV2",
                        "id",
                        "character_id",
                        v2CharacterIds
                    );

                const v2InstallationIds =
                    this.valuesByList(
                        "CharacterGuildInstallationsV2",
                        "id",
                        "character_id",
                        v2CharacterIds
                    ).map(String);

                const v1CharacterIds =
                    this.values(
                        "Characters",
                        "id",
                        "owner_id = ?",
                        discordUserId
                    );

                this.deleteProxyMessages(
                    discordUserId,
                    [
                        ...v1CharacterIds,
                        ...v2CharacterIds
                    ]
                );

                this.deleteDirectUserRows(
                    discordUserId
                );

                this.deleteMigrationLinks(
                    [
                        ...v2CharacterIds,
                        ...v2ContinuityIds,
                        ...v2InstallationIds
                    ]
                );

                this.deleteByValues(
                    "Characters",
                    "id",
                    v1CharacterIds
                );

                if (v2User) {
                    this.db.prepare(`
                        DELETE FROM UsersV2
                        WHERE id = ?
                    `).run(v2User.id);
                }

                this.anonymizeReferences(
                    discordUserId
                );
            });

        eraseTransaction();

        return summary;
    }

    deleteProxyMessages(
        discordUserId,
        characterIds
    ) {
        if (!this.tableExists("ProxyMessages")) {
            return;
        }

        this.db.prepare(`
            DELETE FROM ProxyMessages
            WHERE author_id = ?
        `).run(discordUserId);

        this.deleteByValues(
            "ProxyMessages",
            "character_id",
            characterIds
        );
    }

    deleteDirectUserRows(discordUserId) {
        const rules = [
            [
                "GuildCharacterApprovalAutomationRunsV2",
                "discord_user_id"
            ],
            [
                "PendingRelationships",
                "requested_by"
            ],
            [
                "PendingRelationships",
                "target_owner_id"
            ],
            [
                "PendingContinuityRelationshipsV2",
                "requested_by"
            ],
            [
                "PendingContinuityRelationshipsV2",
                "target_owner_id"
            ]
        ];

        for (const [table, column] of rules) {
            if (!this.columnExists(table, column)) {
                continue;
            }

            this.db.prepare(`
                DELETE FROM ${table}
                WHERE ${column} = ?
            `).run(discordUserId);
        }
    }

    deleteMigrationLinks(characterIds) {
        if (
            !this.tableExists("MigrationV1ToV2")
            || characterIds.length === 0
        ) {
            return;
        }

        this.deleteByValues(
            "MigrationV1ToV2",
            "new_id",
            characterIds
        );
    }

    anonymizeReferences(discordUserId) {
        const nullableReferences = [
            ["Characters", "validated_by"],
            ["CharacterGuildInstallationsV2", "validated_by"],
            ["PendingRelationships", "responded_by"],
            ["PendingContinuityRelationshipsV2", "responded_by"],
            ["CharacterChangeRequestsV2", "reviewed_by"],
            ["InstallationValidationHistoryV2", "actor_id"]
        ];

        const requiredReferences = [
            ["CharacterRelationships", "created_by"],
            ["StateTypes", "created_by"],
            ["CharacterStates", "created_by"],
            ["CharacterEncounters", "created_by"],
            ["ContinuityRelationshipsV2", "created_by"],
            ["ContinuityStatesV2", "created_by"],
            ["ContinuityEncountersV2", "created_by"],
            ["CharacterChangeRequestsV2", "submitted_by"],
            ["ContinuityAssetsV2", "created_by"],
            ["ContinuityAssetTransfersV2", "transferred_by"],
            ["GuildSceneAssistantScopesV2", "created_by"]
        ];

        for (
            const [table, column]
            of nullableReferences
        ) {
            this.updateReference(
                table,
                column,
                discordUserId,
                null
            );
        }

        for (
            const [table, column]
            of requiredReferences
        ) {
            this.updateReference(
                table,
                column,
                discordUserId,
                ANONYMOUS_USER
            );
        }
    }

    updateReference(
        table,
        column,
        discordUserId,
        replacement
    ) {
        if (!this.columnExists(table, column)) {
            return;
        }

        this.db.prepare(`
            UPDATE ${table}
            SET ${column} = ?
            WHERE ${column} = ?
        `).run(
            replacement,
            discordUserId
        );
    }

    values(
        table,
        column,
        where,
        ...parameters
    ) {
        if (!this.tableExists(table)) {
            return [];
        }

        return this.db.prepare(`
            SELECT ${column}
            FROM ${table}
            WHERE ${where}
        `).all(...parameters)
            .map(row => row[column]);
    }

    valuesByList(
        table,
        selectedColumn,
        filterColumn,
        values
    ) {
        if (
            !this.tableExists(table)
            || values.length === 0
        ) {
            return [];
        }

        const placeholders =
            values.map(() => "?").join(", ");

        return this.db.prepare(`
            SELECT ${selectedColumn}
            FROM ${table}
            WHERE ${filterColumn} IN (${placeholders})
        `).all(...values)
            .map(row => row[selectedColumn]);
    }

    deleteByValues(table, column, values) {
        if (
            !this.tableExists(table)
            || values.length === 0
        ) {
            return;
        }

        const placeholders =
            values.map(() => "?").join(", ");

        this.db.prepare(`
            DELETE FROM ${table}
            WHERE ${column} IN (${placeholders})
        `).run(...values);
    }

    count(table, where, ...parameters) {
        if (!this.tableExists(table)) {
            return 0;
        }

        return Number(
            this.db.prepare(`
                SELECT COUNT(*) AS total
                FROM ${table}
                WHERE ${where}
            `).get(...parameters).total
        );
    }

    tableExists(table) {
        return Boolean(
            this.db.prepare(`
                SELECT 1
                FROM sqlite_master
                WHERE type = 'table'
                AND name = ?
            `).get(table)
        );
    }

    columnExists(table, column) {
        if (!this.tableExists(table)) {
            return false;
        }

        return this.db.prepare(`
            PRAGMA table_info(${table})
        `).all().some(
            entry => entry.name === column
        );
    }

}

const repository =
    new UserPrivacyRepository();

module.exports = repository;
module.exports.UserPrivacyRepository =
    UserPrivacyRepository;
module.exports.ANONYMOUS_USER =
    ANONYMOUS_USER;
