const db =
    require(
        "../../database/database"
    );

class InstallationRepository {

    getById(
        installationId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterGuildInstallationsV2
            WHERE id = ?
        `).get(
            installationId
        );
    }

    getByContinuityAndGuild(
        continuityId,
        guildId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterGuildInstallationsV2
            WHERE continuity_id = ?
            AND guild_id = ?
        `).get(
            continuityId,
            guildId
        );
    }

    getByContinuity(
        continuityId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterGuildInstallationsV2
            WHERE continuity_id = ?
            ORDER BY installed_at ASC
        `).all(
            continuityId
        );
    }

    getByCharacter(
        characterId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterGuildInstallationsV2
            WHERE character_id = ?
            ORDER BY installed_at ASC
        `).all(
            characterId
        );
    }

    getByGuild(
        guildId
    ) {
        return db.prepare(`
            SELECT
                installation.*,
                character.proxy_name,
                continuity.name
                    AS continuity_name
            FROM CharacterGuildInstallationsV2
                AS installation
            JOIN CharactersV2
                AS character
                ON character.id =
                    installation.character_id
            JOIN CharacterContinuitiesV2
                AS continuity
                ON continuity.id =
                    installation.continuity_id
            WHERE installation.guild_id = ?
            ORDER BY
                installation.installed_at
                    DESC
        `).all(
            guildId
        );
    }

    getPlayableCharactersForGuild(
        guildId
    ) {
        return db.prepare(`
            SELECT
                character.id,
                installation.guild_id,
                user.discord_user_id
                    AS owner_id,
                character.proxy_name
                    AS name,
                COALESCE(
                    installation.local_avatar_url,
                    character.avatar_url
                ) AS avatar
            FROM CharacterGuildInstallationsV2
                AS installation
            JOIN CharactersV2
                AS character
                ON character.id =
                    installation.character_id
            JOIN UsersV2
                AS user
                ON user.id =
                    character.owner_user_id
            WHERE installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1
            AND character.character_type = 'personnage_joue'
            AND character.is_archived = 0
            ORDER BY
                character.proxy_name
                    COLLATE NOCASE ASC,
                character.id ASC
        `).all(
            guildId
        );
    }

    getContinuityById(
        continuityId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterContinuitiesV2
            WHERE id = ?
        `).get(
            continuityId
        );
    }

    insert(
        data
    ) {
        const result =
            db.prepare(`
                INSERT INTO CharacterGuildInstallationsV2 (
                    character_id,
                    continuity_id,
                    guild_id,
                    status,
                    visibility,
                    proxy_enabled,
                    local_avatar_url,
                    validated_by,
                    validated_at,
                    rejection_reason,
                    installed_at,
                    updated_at,
                    last_activity_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?
                )
            `).run(
                data.characterId,
                data.continuityId,
                data.guildId,
                data.status,
                data.visibility,
                data.proxyEnabled,
                data.localAvatarUrl,
                data.validatedBy,
                data.validatedAt,
                data.rejectionReason,
                data.installedAt,
                data.updatedAt,
                data.lastActivityAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    insertDraft({
        characterId,
        continuityId,
        guildId,
        visibility,
        createdAt
    }) {
        const result =
            db.prepare(`
                INSERT INTO CharacterGuildInstallationsV2 (
                    character_id,
                    continuity_id,
                    guild_id,
                    status,
                    visibility,
                    installed_at,
                    updated_at
                )
                VALUES (?, ?, ?, 'draft', ?, ?, ?)
            `).run(
                characterId,
                continuityId,
                guildId,
                visibility,
                createdAt,
                createdAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    updateStatus(
        installationId,
        data
    ) {
        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                status = ?,
                proxy_enabled = ?,
                validated_by = ?,
                validated_at = ?,
                rejection_reason = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.status,
            data.proxyEnabled,
            data.validatedBy,
            data.validatedAt,
            data.rejectionReason,
            data.updatedAt,
            installationId
        );

        return this.getById(
            installationId
        );
    }

    setStatus(
        installationId,
        status,
        updatedAt
    ) {
        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                status = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            status,
            updatedAt,
            installationId
        );

        return this.getById(
            installationId
        );
    }

    setVisibility(
        installationId,
        visibility,
        updatedAt
    ) {
        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                visibility = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            visibility,
            updatedAt,
            installationId
        );

        return this.getById(
            installationId
        );
    }

    touchActivity(
        installationId,
        activityAt
    ) {
        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                last_activity_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            activityAt,
            activityAt,
            installationId
        );

        return this.getById(
            installationId
        );
    }

    setLocalAvatar(
        installationId,
        avatarUrl,
        updatedAt
    ) {
        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                local_avatar_url = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            avatarUrl,
            updatedAt,
            installationId
        );

        return this.getById(
            installationId
        );
    }

    getEffectiveAvatar(
        installationId
    ) {
        return db.prepare(`
            SELECT
                COALESCE(
                    installation.local_avatar_url,
                    character.avatar_url
                ) AS avatar_url,
                installation.local_avatar_url,
                character.avatar_url
                    AS global_avatar_url
            FROM CharacterGuildInstallationsV2
                AS installation
            JOIN CharactersV2
                AS character
                ON character.id =
                    installation.character_id
            WHERE installation.id = ?
        `).get(
            installationId
        );
    }

    delete(
        installationId
    ) {
        return db.prepare(`
            DELETE FROM CharacterGuildInstallationsV2
            WHERE id = ?
        `).run(
            installationId
        );
    }

    resetRejected(
        installationId,
        updatedAt
    ) {
        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                status = 'draft',
                proxy_enabled = 0,
                validated_by = NULL,
                validated_at = NULL,
                rejection_reason = NULL,
                updated_at = ?
            WHERE id = ?
            AND status = 'rejected'
        `).run(
            updatedAt,
            installationId
        );

        return this.getById(
            installationId
        );
    }

    resetRejectedMany(
        installationIds,
        updatedAt
    ) {
        const resetAll =
            db.transaction(
                ids => {
                    const statement =
                        db.prepare(`
                            UPDATE CharacterGuildInstallationsV2
                            SET
                                status = 'draft',
                                proxy_enabled = 0,
                                validated_by = NULL,
                                validated_at = NULL,
                                rejection_reason = NULL,
                                updated_at = ?
                            WHERE id = ?
                            AND status = 'rejected'
                        `);

                    for (
                        const installationId
                        of ids
                    ) {
                        statement.run(
                            updatedAt,
                            installationId
                        );
                    }
                }
            );

        resetAll(
            installationIds
        );
    }

}

module.exports =
    new InstallationRepository();
