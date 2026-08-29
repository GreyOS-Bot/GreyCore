const db =
    require("../../database/database");

class SceneAssistantRepository {

    saveStartProposal({
        guildId,
        channelId,
        messageId,
        characterId,
        proposedAt
    }) {
        return db.prepare(`
            INSERT INTO SceneStartProposalsV2 (
                guild_id, channel_id, message_id, character_id,
                proposed_at, status
            ) VALUES (?, ?, ?, ?, ?, 'pending')
            ON CONFLICT(guild_id, channel_id) DO UPDATE SET
                message_id = excluded.message_id,
                character_id = excluded.character_id,
                proposed_at = excluded.proposed_at,
                status = 'pending'
            WHERE SceneStartProposalsV2.status != 'pending'
        `).run(
            guildId,
            channelId,
            messageId,
            characterId,
            proposedAt
        ).changes === 1;
    }

    getStartProposalByMessage(messageId) {
        return db.prepare(`
            SELECT * FROM SceneStartProposalsV2
            WHERE message_id = ? AND status = 'pending'
        `).get(messageId) || null;
    }

    getPendingStartProposal(guildId, channelId) {
        return db.prepare(`
            SELECT * FROM SceneStartProposalsV2
            WHERE guild_id = ? AND channel_id = ? AND status = 'pending'
        `).get(guildId, channelId) || null;
    }

    resolveStartProposal(guildId, channelId, status) {
        return db.prepare(`
            UPDATE SceneStartProposalsV2
            SET status = ?
            WHERE guild_id = ? AND channel_id = ? AND status = 'pending'
        `).run(status, guildId, channelId).changes === 1;
    }

    getTriggerExpressions(guildId) {
        return db.prepare(`
            SELECT *
            FROM GuildSceneTriggerExpressionsV2
            WHERE guild_id = ?
            ORDER BY expression COLLATE NOCASE
        `).all(guildId);
    }

    addTriggerExpression({
        guildId,
        expression,
        normalizedExpression,
        createdBy,
        createdAt
    }) {
        db.prepare(`
            INSERT INTO GuildSceneTriggerExpressionsV2 (
                guild_id, expression, normalized_expression,
                created_by, created_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, normalized_expression)
            DO UPDATE SET expression = excluded.expression
        `).run(
            guildId,
            expression,
            normalizedExpression,
            createdBy,
            createdAt
        );

        return this.getTriggerExpressions(guildId);
    }

    removeTriggerExpression(guildId, normalizedExpression) {
        return db.prepare(`
            DELETE FROM GuildSceneTriggerExpressionsV2
            WHERE guild_id = ? AND normalized_expression = ?
        `).run(guildId, normalizedExpression).changes === 1;
    }

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

    moveSceneIfCurrent({
        sceneId,
        guildId,
        expectedSourceChannelId,
        destinationChannelId,
        transitionMessageId,
        createdBy,
        movedAt
    }) {
        if (
            expectedSourceChannelId
            === destinationChannelId
        ) {
            return {
                moved: false,
                reason: "same_channel"
            };
        }

        const destinationOccupied =
            new Error(
                "SCENE_DESTINATION_OCCUPIED"
            );
        destinationOccupied.code =
            "SCENE_DESTINATION_OCCUPIED";

        const transaction =
            db.transaction(() => {
                const claimed =
                    db.prepare(`
                        UPDATE SceneChannelsV2
                        SET unlinked_at = ?
                        WHERE scene_id = ?
                        AND guild_id = ?
                        AND channel_id = ?
                        AND unlinked_at IS NULL
                        AND EXISTS (
                            SELECT 1
                            FROM ScenesV2
                            WHERE id = ?
                            AND guild_id = ?
                            AND status IN (
                                'active',
                                'conclude'
                            )
                        )
                    `).run(
                        movedAt,
                        sceneId,
                        guildId,
                        expectedSourceChannelId,
                        sceneId,
                        guildId
                    );

                if (claimed.changes !== 1) {
                    return {
                        moved: false,
                        reason: "stale_source"
                    };
                }

                const occupied =
                    db.prepare(`
                        SELECT scene_id
                        FROM SceneChannelsV2
                        WHERE guild_id = ?
                        AND channel_id = ?
                        AND unlinked_at IS NULL
                        LIMIT 1
                    `).get(
                        guildId,
                        destinationChannelId
                    );

                if (occupied) {
                    throw destinationOccupied;
                }

                const inserted =
                    db.prepare(`
                        INSERT INTO SceneChannelsV2 (
                            scene_id,
                            guild_id,
                            channel_id,
                            linked_at,
                            source_channel_id,
                            transition_message_id,
                            created_by
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        sceneId,
                        guildId,
                        destinationChannelId,
                        movedAt,
                        expectedSourceChannelId,
                        transitionMessageId,
                        createdBy
                    );

                return {
                    moved: true,
                    reason: null,
                    linkId:
                        inserted.lastInsertRowid,
                    scene:
                        this.getScene(sceneId)
                };
            });

        try {
            return transaction();
        } catch (error) {
            if (
                error.code
                === "SCENE_DESTINATION_OCCUPIED"
            ) {
                return {
                    moved: false,
                    reason:
                        "destination_occupied"
                };
            }

            throw error;
        }
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

    getPendingClosurePrompt(sceneId) {
        return db.prepare(`
            SELECT * FROM SceneClosurePromptsV2
            WHERE scene_id = ? AND status = 'pending'
        `).get(sceneId) || null;
    }

    getClosurePromptByMessage(messageId) {
        return db.prepare(`
            SELECT * FROM SceneClosurePromptsV2
            WHERE message_id = ? AND status = 'pending'
        `).get(messageId) || null;
    }

    getInactiveScenes(nowIso) {
        return db.prepare(`
            SELECT scene.*, link.channel_id,
                settings.inactivity_hours
            FROM ScenesV2 scene
            JOIN GuildSceneAssistantSettingsV2 settings
                ON settings.guild_id = scene.guild_id
            JOIN SceneChannelsV2 link
                ON link.scene_id = scene.id
                AND link.unlinked_at IS NULL
            LEFT JOIN SceneClosurePromptsV2 prompt
                ON prompt.scene_id = scene.id
                AND prompt.status = 'pending'
            WHERE settings.is_enabled = 1
            AND settings.inactivity_hours > 0
            AND scene.status IN ('active', 'conclude')
            AND scene.last_rp_message_at IS NOT NULL
            AND datetime(scene.last_rp_message_at, '+' || settings.inactivity_hours || ' hours') <= datetime(?)
            AND prompt.scene_id IS NULL
        `).all(nowIso);
    }

    saveClosurePrompt({
        sceneId,
        guildId,
        channelId,
        messageId,
        promptedAt
    }) {
        db.prepare(`
            DELETE FROM SceneClosureVotesV2
            WHERE scene_id = ?
        `).run(sceneId);

        db.prepare(`
            INSERT INTO SceneClosurePromptsV2 (
                scene_id, guild_id, channel_id, message_id,
                status, prompted_at
            ) VALUES (?, ?, ?, ?, 'pending', ?)
            ON CONFLICT(scene_id) DO UPDATE SET
                channel_id = excluded.channel_id,
                message_id = excluded.message_id,
                status = 'pending',
                prompted_at = excluded.prompted_at,
                resolved_at = NULL
        `).run(sceneId, guildId, channelId, messageId, promptedAt);
    }

    resolveClosurePrompt(sceneId, status, resolvedAt) {
        db.prepare(`
            UPDATE SceneClosurePromptsV2
            SET status = ?, resolved_at = ?
            WHERE scene_id = ? AND status = 'pending'
        `).run(status, resolvedAt, sceneId);
    }

    addClosureVote(sceneId, discordUserId, votedAt) {
        db.prepare(`
            INSERT INTO SceneClosureVotesV2 (
                scene_id, discord_user_id, voted_at
            ) VALUES (?, ?, ?)
            ON CONFLICT(scene_id, discord_user_id) DO NOTHING
        `).run(sceneId, discordUserId, votedAt);

        return db.prepare(`
            SELECT COUNT(*) AS total
            FROM SceneClosureVotesV2
            WHERE scene_id = ?
        `).get(sceneId).total;
    }

    isSceneParticipantUser(sceneId, discordUserId) {
        const registered = db.prepare(`
            SELECT 1
            FROM SceneParticipantsV2 participant
            JOIN CharactersV2 character
                ON character.id = participant.character_id
            JOIN UsersV2 user
                ON user.id = character.owner_user_id
            WHERE participant.scene_id = ?
            AND participant.left_at IS NULL
            AND user.discord_user_id = ?
            LIMIT 1
        `).get(sceneId, discordUserId);

        if (registered) return true;

        return Boolean(db.prepare(`
            SELECT 1
            FROM ProxyMessages proxy
            JOIN ScenesV2 scene
                ON scene.id = ?
            JOIN SceneChannelsV2 link
                ON link.scene_id = scene.id
                AND link.channel_id = proxy.channel_id
            JOIN CharactersV2 character
                ON character.id = proxy.character_id
            JOIN UsersV2 user
                ON user.id = character.owner_user_id
            WHERE proxy.guild_id = scene.guild_id
            AND proxy.character_version = 'v2'
            AND proxy.created_at >= scene.started_at
            AND proxy.author_id = ?
            AND user.discord_user_id = ?
            LIMIT 1
        `).get(sceneId, discordUserId, discordUserId));
    }

    touchScene(sceneId, occurredAt) {
        db.prepare(`
            UPDATE ScenesV2
            SET last_rp_message_at = ?, updated_at = ?
            WHERE id = ?
        `).run(occurredAt, occurredAt, sceneId);
    }

    closeScene(
        sceneId,
        endedAt,
        requirePendingPrompt = false
    ) {
        const transaction = db.transaction(() => {
            const claimed = db.prepare(`
                UPDATE ScenesV2
                SET status = 'closed', ended_at = ?, updated_at = ?
                WHERE id = ?
                AND status IN ('active', 'conclude')
                AND (
                    ? = 0
                    OR EXISTS (
                        SELECT 1
                        FROM SceneClosurePromptsV2
                        WHERE scene_id = ?
                        AND status = 'pending'
                    )
                )
            `).run(
                endedAt,
                endedAt,
                sceneId,
                requirePendingPrompt ? 1 : 0,
                sceneId
            );

            if (claimed.changes !== 1) {
                return null;
            }

            db.prepare(`
                UPDATE SceneClosurePromptsV2
                SET status = 'closed', resolved_at = ?
                WHERE scene_id = ? AND status = 'pending'
            `).run(endedAt, sceneId);

            db.prepare(`
                UPDATE SceneChannelsV2
                SET unlinked_at = ?
                WHERE scene_id = ? AND unlinked_at IS NULL
            `).run(endedAt, sceneId);
            db.prepare(`
                UPDATE SceneParticipantsV2
                SET left_at = ?
                WHERE scene_id = ? AND left_at IS NULL
            `).run(endedAt, sceneId);

            return this.getScene(sceneId);
        });
        return transaction();
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
        inactivityHours,
        updatedAt
    }) {
        db.prepare(`
            INSERT INTO GuildSceneAssistantSettingsV2 (
                guild_id,
                is_enabled,
                duration_days,
                recommended_message_count,
                inactivity_hours,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)

            ON CONFLICT(guild_id)
            DO UPDATE SET
                is_enabled = excluded.is_enabled,
                duration_days = excluded.duration_days,
                recommended_message_count = excluded.recommended_message_count,
                inactivity_hours = excluded.inactivity_hours,
                updated_at = excluded.updated_at
        `).run(
            guildId,
            isEnabled ? 1 : 0,
            durationDays,
            recommendedMessageCount,
            inactivityHours,
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
