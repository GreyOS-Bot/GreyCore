const database = require(
    "../../database/database"
);
const {
    randomUUID
} = require("node:crypto");

class UserPrivacyRepository {

    constructor(
        db = database,
        anonymousIdFactory = () =>
            `forgotten:${randomUUID()}`
    ) {
        this.db = db;
        this.anonymousIdFactory =
            anonymousIdFactory;
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

        const anonymousId =
            this.anonymousIdFactory();

        const eraseTransaction =
            this.db.transaction(() => {
                this.replaceReference(
                    "UsersV2",
                    "discord_user_id",
                    discordUserId,
                    anonymousId
                );

                this.replaceReference(
                    "Characters",
                    "owner_id",
                    discordUserId,
                    anonymousId
                );

                this.replaceReference(
                    "ProxyMessages",
                    "author_id",
                    discordUserId,
                    anonymousId
                );

                this.deleteAutomationRuns(
                    discordUserId
                );

                this.anonymizeReferences(
                    discordUserId,
                    anonymousId
                );
            });

        eraseTransaction();

        return {
            ...summary,
            anonymousId
        };
    }

    deleteAutomationRuns(discordUserId) {
        if (
            !this.columnExists(
                "GuildCharacterApprovalAutomationRunsV2",
                "discord_user_id"
            )
        ) {
            return;
        }

        this.db.prepare(`
            DELETE FROM GuildCharacterApprovalAutomationRunsV2
            WHERE discord_user_id = ?
        `).run(discordUserId);
    }

    anonymizeReferences(
        discordUserId,
        anonymousId
    ) {
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
            ["GuildSceneAssistantScopesV2", "created_by"],
            ["PendingRelationships", "requested_by"],
            ["PendingRelationships", "target_owner_id"],
            ["PendingContinuityRelationshipsV2", "requested_by"],
            ["PendingContinuityRelationshipsV2", "target_owner_id"]
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
                anonymousId
            );
        }
    }

    replaceReference(
        table,
        column,
        discordUserId,
        replacement
    ) {
        this.updateReference(
            table,
            column,
            discordUserId,
            replacement
        );
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
