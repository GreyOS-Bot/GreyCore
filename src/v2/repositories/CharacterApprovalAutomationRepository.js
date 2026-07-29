const db =
    require("../../database/database");

class CharacterApprovalAutomationRepository {

    getConfiguration(guildId) {
        return db.prepare(`
            SELECT *
            FROM GuildCharacterApprovalAutomationsV2
            WHERE guild_id = ?
        `).get(
            guildId
        );
    }

    saveConfiguration({
        guildId,
        approvedCharacterCount,
        requiredRoleId,
        removeRoleId,
        addRoleId,
        welcomeChannelId,
        welcomeMessage,
        updatedAt
    }) {
        db.prepare(`
            INSERT INTO GuildCharacterApprovalAutomationsV2 (
                guild_id,
                is_enabled,
                approved_character_count,
                required_role_id,
                remove_role_id,
                add_role_id,
                welcome_channel_id,
                welcome_message,
                created_at,
                updated_at
            )
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)

            ON CONFLICT(guild_id)
            DO UPDATE SET
                is_enabled = 1,
                approved_character_count = excluded.approved_character_count,
                required_role_id = excluded.required_role_id,
                remove_role_id = excluded.remove_role_id,
                add_role_id = excluded.add_role_id,
                welcome_channel_id = excluded.welcome_channel_id,
                welcome_message = excluded.welcome_message,
                updated_at = excluded.updated_at
        `).run(
            guildId,
            approvedCharacterCount,
            requiredRoleId,
            removeRoleId,
            addRoleId,
            welcomeChannelId,
            welcomeMessage,
            updatedAt,
            updatedAt
        );

        return this.getConfiguration(
            guildId
        );
    }

    disable(guildId, updatedAt) {
        const configuration =
            this.getConfiguration(guildId);

        if (!configuration) {
            return null;
        }

        db.prepare(`
            UPDATE GuildCharacterApprovalAutomationsV2
            SET
                is_enabled = 0,
                updated_at = ?
            WHERE guild_id = ?
        `).run(
            updatedAt,
            guildId
        );

        return this.getConfiguration(
            guildId
        );
    }

    countApprovedCharacters(
        guildId,
        discordUserId
    ) {
        const result = db.prepare(`
            SELECT
                COUNT(DISTINCT installation.character_id)
                    AS total
            FROM CharacterGuildInstallationsV2
                AS installation
            JOIN CharactersV2 AS character
                ON character.id = installation.character_id
            JOIN UsersV2 AS owner
                ON owner.id = character.owner_user_id
            WHERE installation.guild_id = ?
            AND owner.discord_user_id = ?
            AND installation.status = 'approved'
        `).get(
            guildId,
            discordUserId
        );

        return result?.total || 0;
    }

    getRun(guildId, discordUserId) {
        return db.prepare(`
            SELECT *
            FROM GuildCharacterApprovalAutomationRunsV2
            WHERE guild_id = ?
            AND discord_user_id = ?
        `).get(
            guildId,
            discordUserId
        );
    }

    claimRun({
        guildId,
        discordUserId,
        approvedCharacterCount,
        claimedAt
    }) {
        const staleBefore =
            new Date(
                new Date(claimedAt).getTime()
                - 15 * 60 * 1_000
            ).toISOString();

        return db.transaction(
            () => {
                const existing =
                    this.getRun(
                        guildId,
                        discordUserId
                    );

                if (
                    existing?.status === "completed"
                ) {
                    return false;
                }

                if (
                    existing?.status === "pending"
                    && existing.claimed_at > staleBefore
                ) {
                    return false;
                }

                if (existing) {
                    db.prepare(`
                        DELETE FROM GuildCharacterApprovalAutomationRunsV2
                        WHERE guild_id = ?
                        AND discord_user_id = ?
                    `).run(
                        guildId,
                        discordUserId
                    );
                }

                const result = db.prepare(`
                    INSERT INTO GuildCharacterApprovalAutomationRunsV2 (
                        guild_id,
                        discord_user_id,
                        approved_character_count,
                        status,
                        claimed_at
                    )
                    VALUES (?, ?, ?, 'pending', ?)
                `).run(
                    guildId,
                    discordUserId,
                    approvedCharacterCount,
                    claimedAt
                );

                return result.changes === 1;
            }
        )();
    }

    completeRun({
        guildId,
        discordUserId,
        completedAt
    }) {
        db.prepare(`
            UPDATE GuildCharacterApprovalAutomationRunsV2
            SET
                status = 'completed',
                completed_at = ?
            WHERE guild_id = ?
            AND discord_user_id = ?
            AND status = 'pending'
        `).run(
            completedAt,
            guildId,
            discordUserId
        );
    }

    releaseRun(guildId, discordUserId) {
        db.prepare(`
            DELETE FROM GuildCharacterApprovalAutomationRunsV2
            WHERE guild_id = ?
            AND discord_user_id = ?
            AND status = 'pending'
        `).run(
            guildId,
            discordUserId
        );
    }

}

module.exports =
    new CharacterApprovalAutomationRepository();
