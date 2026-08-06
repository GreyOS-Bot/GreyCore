const db =
    require("../../database/database");

class SceneAssistantRepository {

    createScene({
        id,
        guildId,
        title,
        createdBy,
        startedAt
    }) {
        db.prepare(`
            INSERT INTO ScenesV2 (
                id, guild_id, title, status, started_at,
                rp_message_count, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, 'active', ?, 0, ?, ?, ?)
        `).run(
            id,
            guildId,
            title,
            startedAt,
            createdBy,
            startedAt,
            startedAt
        );

        return this.getScene(id);
    }

    getScene(sceneId) {
        return db.prepare(`
            SELECT scene.*,
                (
                    SELECT GROUP_CONCAT(link.channel_id)
                    FROM SceneChannelsV2 link
                    WHERE link.scene_id = scene.id
                    AND link.unlinked_at IS NULL
                ) AS channel_ids
            FROM ScenesV2 scene
            WHERE scene.id = ?
        `).get(sceneId) || null;
    }

    getActiveSceneByChannel(guildId, channelId) {
        return db.prepare(`
            SELECT scene.*
            FROM SceneChannelsV2 link
            JOIN ScenesV2 scene ON scene.id = link.scene_id
            WHERE link.guild_id = ?
            AND link.channel_id = ?
            AND link.unlinked_at IS NULL
            AND scene.status IN ('active', 'conclude')
            ORDER BY link.id DESC
            LIMIT 1
        `).get(guildId, channelId) || null;
    }

    getActiveScenes(guildId) {
        return db.prepare(`
            SELECT scene.*,
                GROUP_CONCAT(link.channel_id) AS channel_ids
            FROM ScenesV2 scene
            LEFT JOIN SceneChannelsV2 link
                ON link.scene_id = scene.id
                AND link.unlinked_at IS NULL
            WHERE scene.guild_id = ?
            AND scene.status IN ('active', 'conclude')
            GROUP BY scene.id
            ORDER BY scene.updated_at DESC
        `).all(guildId);
    }

    claimPrompt(guildId, channelId, promptedAt, cooldownSince) {
        const result = db.prepare(`
            INSERT INTO SceneAssistantChannelPromptsV2 (
                guild_id, channel_id, last_prompt_at
            ) VALUES (?, ?, ?)
            ON CONFLICT(guild_id, channel_id)
            DO UPDATE SET last_prompt_at = excluded.last_prompt_at
            WHERE last_prompt_at <= ?
        `).run(guildId, channelId, promptedAt, cooldownSince);

        return result.changes === 1;
    }

    linkChannel({
        sceneId,
        guildId,
        channelId,
        sourceChannelId = null,
        transitionMessageId = null,
        createdBy = null,
        linkedAt
    }) {
        db.prepare(`
            UPDATE SceneChannelsV2
            SET unlinked_at = ?
            WHERE guild_id = ? AND channel_id = ? AND unlinked_at IS NULL
        `).run(linkedAt, guildId, channelId);

        db.prepare(`
            INSERT INTO SceneChannelsV2 (
                scene_id, guild_id, channel_id, linked_at,
                source_channel_id, transition_message_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            sceneId,
            guildId,
            channelId,
            linkedAt,
            sourceChannelId,
            transitionMessageId,
            createdBy
        );

        return this.getActiveSceneByChannel(guildId, channelId);
    }

    moveScene({
        sceneId,
        guildId,
        sourceChannelId,
        destinationChannelId,
        transitionMessageId,
        createdBy,
        movedAt
    }) {
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE SceneChannelsV2
                SET unlinked_at = ?
                WHERE scene_id = ? AND channel_id = ? AND unlinked_at IS NULL
            `).run(movedAt, sceneId, sourceChannelId);

            return this.linkChannel({
                sceneId,
                guildId,
                channelId: destinationChannelId,
                sourceChannelId,
                transitionMessageId,
                createdBy,
                linkedAt: movedAt
            });
        });

        return transaction();
    }

    recordSceneMessage(sceneId, occurredAt) {
        db.prepare(`
            UPDATE ScenesV2
            SET last_rp_message_at = ?,
                rp_message_count = rp_message_count + 1,
                updated_at = ?
            WHERE id = ?
        `).run(occurredAt, occurredAt, sceneId);

        return this.getScene(sceneId);
    }

    markSceneConclude(sceneId, notifiedAt) {
        db.prepare(`
            UPDATE ScenesV2
            SET status = 'conclude',
                threshold_notified_at = COALESCE(threshold_notified_at, ?),
                updated_at = ?
            WHERE id = ?
        `).run(notifiedAt, notifiedAt, sceneId);

        return this.getScene(sceneId);
    }

    restartScene(sceneId, startedAt) {
        db.prepare(`
            UPDATE ScenesV2
            SET started_at = ?, last_rp_message_at = NULL,
                rp_message_count = 0, status = 'active',
                threshold_notified_at = NULL, updated_at = ?
            WHERE id = ?
        `).run(startedAt, startedAt, sceneId);

        return this.getScene(sceneId);
    }

    addParticipant(sceneId, characterId, joinedAt) {
        db.prepare(`
            INSERT INTO SceneParticipantsV2 (
                scene_id, character_id, joined_at, left_at
            ) VALUES (?, ?, ?, NULL)
            ON CONFLICT(scene_id, character_id)
            DO UPDATE SET left_at = NULL
        `).run(sceneId, characterId, joinedAt);
    }

    getActiveSceneForCharacter(guildId, characterId) {
        return db.prepare(`
            SELECT scene.*
            FROM SceneParticipantsV2 participant
            JOIN ScenesV2 scene ON scene.id = participant.scene_id
            WHERE scene.guild_id = ?
            AND participant.character_id = ?
            AND participant.left_at IS NULL
            AND scene.status IN ('active', 'conclude')
            ORDER BY scene.updated_at DESC
            LIMIT 1
        `).get(guildId, characterId) || null;
    }

    claimTimelineWarning(sceneAId, sceneBId, characterId, warnedAt) {
        const [first, second] = [sceneAId, sceneBId].sort();
        return db.prepare(`
            INSERT INTO SceneTimelineWarningsV2 (
                scene_a_id, scene_b_id, character_id, warned_at
            ) VALUES (?, ?, ?, ?)
            ON CONFLICT(scene_a_id, scene_b_id, character_id) DO NOTHING
        `).run(first, second, characterId, warnedAt).changes === 1;
    }

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
