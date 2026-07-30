const db =
    require("../../database/database");

class SceneAssistantRepository {

    getConfiguration(guildId) {
        return db.prepare(`
            SELECT *
            FROM GuildSceneAssistantSettingsV2
            WHERE guild_id = ?
        `).get(guildId) || null;
    }

    saveConfiguration({
        guildId,
        isEnabled,
        durationDays,
        recommendedMessageCount,
        updatedAt
    }) {
        db.prepare(`
            INSERT INTO GuildSceneAssistantSettingsV2 (
                guild_id,
                is_enabled,
                duration_days,
                recommended_message_count,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)

            ON CONFLICT(guild_id)
            DO UPDATE SET
                is_enabled = excluded.is_enabled,
                duration_days = excluded.duration_days,
                recommended_message_count = excluded.recommended_message_count,
                updated_at = excluded.updated_at
        `).run(
            guildId,
            isEnabled ? 1 : 0,
            durationDays,
            recommendedMessageCount,
            updatedAt,
            updatedAt
        );

        return this.getConfiguration(guildId);
    }

    getScopes(guildId) {
        return db.prepare(`
            SELECT *
            FROM GuildSceneAssistantScopesV2
            WHERE guild_id = ?
            ORDER BY created_at ASC, channel_id ASC
        `).all(guildId);
    }

    addScope({
        guildId,
        channelId,
        createdBy,
        createdAt
    }) {
        db.prepare(`
            INSERT INTO GuildSceneAssistantScopesV2 (
                guild_id,
                channel_id,
                created_by,
                created_at
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(guild_id, channel_id)
            DO NOTHING
        `).run(
            guildId,
            channelId,
            createdBy,
            createdAt
        );

        return this.getScopes(guildId);
    }

    removeScope(guildId, channelId) {
        return db.prepare(`
            DELETE FROM GuildSceneAssistantScopesV2
            WHERE guild_id = ?
            AND channel_id = ?
        `).run(guildId, channelId).changes === 1;
    }

    getCycle(guildId, channelId) {
        return db.prepare(`
            SELECT *
            FROM SceneAssistantCyclesV2
            WHERE guild_id = ?
            AND channel_id = ?
        `).get(guildId, channelId) || null;
    }

    recordMessage({
        guildId,
        channelId,
        occurredAt
    }) {
        db.prepare(`
            INSERT INTO SceneAssistantCyclesV2 (
                guild_id,
                channel_id,
                started_at,
                last_rp_message_at,
                rp_message_count,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, 1, 'active', ?, ?)

            ON CONFLICT(guild_id, channel_id)
            DO UPDATE SET
                last_rp_message_at = excluded.last_rp_message_at,
                rp_message_count = SceneAssistantCyclesV2.rp_message_count + 1,
                updated_at = excluded.updated_at
        `).run(
            guildId,
            channelId,
            occurredAt,
            occurredAt,
            occurredAt,
            occurredAt
        );

        return this.getCycle(guildId, channelId);
    }

    startNewCycle({
        guildId,
        channelId,
        startedAt
    }) {
        db.prepare(`
            INSERT INTO SceneAssistantCyclesV2 (
                guild_id,
                channel_id,
                started_at,
                last_rp_message_at,
                rp_message_count,
                status,
                threshold_notified_at,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, NULL, 0, 'active', NULL, ?, ?)

            ON CONFLICT(guild_id, channel_id)
            DO UPDATE SET
                started_at = excluded.started_at,
                last_rp_message_at = NULL,
                rp_message_count = 0,
                status = 'active',
                threshold_notified_at = NULL,
                updated_at = excluded.updated_at
        `).run(
            guildId,
            channelId,
            startedAt,
            startedAt,
            startedAt
        );

        return this.getCycle(guildId, channelId);
    }

    markConclude({
        guildId,
        channelId,
        notifiedAt
    }) {
        db.prepare(`
            UPDATE SceneAssistantCyclesV2
            SET
                status = 'conclude',
                threshold_notified_at = COALESCE(
                    threshold_notified_at,
                    ?
                ),
                updated_at = ?
            WHERE guild_id = ?
            AND channel_id = ?
        `).run(
            notifiedAt,
            notifiedAt,
            guildId,
            channelId
        );

        return this.getCycle(guildId, channelId);
    }

}

module.exports =
    new SceneAssistantRepository();
