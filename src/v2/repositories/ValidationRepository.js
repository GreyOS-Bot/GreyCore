const db =
    require("../../database/database");

class ValidationRepository {
    getInstallationById(
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

    requireInstallation(
        installationId
    ) {
        const installation =
            this.getInstallationById(
                installationId
            );

        if (!installation) {
            throw new Error(
                "Installation introuvable."
            );
        }

        return installation;
    }

    getInstallationContext(
        installationId
    ) {
        return db.prepare(`
            SELECT
                installation.*,

                character.proxy_name,
                character.character_type,
                character.avatar_url
                    AS global_avatar_url,

                owner.discord_user_id
                    AS owner_id,

                continuity.name
                    AS story_name,

                CASE
                    WHEN profile.continuity_id
                        IS NULL
                    THEN continuity.firstname
                    ELSE profile.firstname
                END AS firstname,
                CASE
                    WHEN profile.continuity_id
                        IS NULL
                    THEN continuity.lastname
                    ELSE profile.lastname
                END AS lastname,
                CASE
                    WHEN profile.continuity_id
                        IS NULL
                    THEN continuity.age
                    ELSE profile.age
                END AS age,
                CASE
                    WHEN profile.continuity_id
                        IS NULL
                    THEN continuity.gang
                    ELSE profile.gang
                END AS gang,
                CASE
                    WHEN profile.continuity_id
                        IS NULL
                    THEN continuity.story
                    ELSE profile.story
                END AS story,

                profile.gender,
                profile.alias,
                profile.height,
                profile.weight,
                profile.birthday,
                profile.creation_date,
                profile.origin,
                profile.occupation,
                profile.faceclaim

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

            LEFT JOIN CharacterProfilesV2
                AS profile
                ON profile.continuity_id =
                    continuity.id

            JOIN UsersV2 AS owner
                ON owner.id =
                    character.owner_user_id

            WHERE installation.id = ?
        `).get(
            installationId
        );
    }

    getPendingForGuild(
        guildId,
        limit
    ) {
        return db.prepare(`
            SELECT
                installation.id,
                installation.guild_id,
                installation.submitted_at,
                installation.validation_channel_id,
                installation.validation_message_id,
                character.proxy_name,
                continuity.name AS continuity_name,
                owner.discord_user_id AS owner_id

            FROM CharacterGuildInstallationsV2
                AS installation

            JOIN CharactersV2 AS character
                ON character.id =
                    installation.character_id

            JOIN CharacterContinuitiesV2 AS continuity
                ON continuity.id =
                    installation.continuity_id

            JOIN UsersV2 AS owner
                ON owner.id =
                    character.owner_user_id

            WHERE installation.guild_id = ?
            AND installation.status = 'pending'

            ORDER BY
                installation.submitted_at ASC,
                installation.id ASC

            LIMIT ?
        `).all(
            guildId,
            limit
        );
    }

    searchIncompleteForGuild(
        guildId,
        filter,
        limit = 25
    ) {
        const search =
            `%${String(filter || "").trim()}%`;

        return db.prepare(`
            SELECT
                installation.id,
                installation.status,
                installation.validation_channel_id,
                installation.validation_message_id,
                character.proxy_name,
                COALESCE(
                    NULLIF(profile.alias, ''),
                    NULLIF(profile.firstname, ''),
                    continuity.firstname,
                    character.proxy_name
                ) AS firstname,
                COALESCE(
                    NULLIF(profile.lastname, ''),
                    continuity.lastname
                ) AS lastname,
                owner.discord_user_id AS owner_id
            FROM CharacterGuildInstallationsV2 AS installation
            JOIN CharactersV2 AS character
                ON character.id = installation.character_id
            JOIN CharacterContinuitiesV2 AS continuity
                ON continuity.id = installation.continuity_id
            JOIN UsersV2 AS owner
                ON owner.id = character.owner_user_id
            LEFT JOIN CharacterProfilesV2 AS profile
                ON profile.continuity_id = continuity.id
            WHERE installation.guild_id = ?
            AND installation.status IN (
                'draft',
                'pending',
                'rejected',
                'suspended'
            )
            AND (
                character.proxy_name LIKE ?
                OR continuity.firstname LIKE ?
                OR continuity.lastname LIKE ?
                OR profile.alias LIKE ?
                OR profile.firstname LIKE ?
                OR profile.lastname LIKE ?
                OR EXISTS (
                    SELECT 1
                    FROM CharacterAliasesV2 AS alias
                    WHERE alias.character_id = character.id
                    AND alias.alias LIKE ?
                )
                OR owner.discord_user_id LIKE ?
            )
            ORDER BY
                character.proxy_name COLLATE NOCASE,
                installation.updated_at DESC
            LIMIT ?
        `).all(
            guildId,
            search,
            search,
            search,
            search,
            search,
            search,
            search,
            search,
            limit
        );
    }

    cancelIncomplete(
        installationId,
        {
            cancelledBy,
            reason
        }
    ) {
        const installation =
            this.requireInstallation(
                installationId
            );

        const cancellableStatuses =
            new Set([
                "draft",
                "pending",
                "rejected",
                "suspended"
            ]);

        if (!cancellableStatuses.has(installation.status)) {
            throw new Error(
                "Seule une installation non aboutie peut être annulée."
            );
        }

        const now = new Date().toISOString();

        db.transaction(() => {
            db.prepare(`
                UPDATE CharacterGuildInstallationsV2
                SET
                    status = 'archived',
                    proxy_enabled = 0,
                    validation_channel_id = NULL,
                    validation_message_id = NULL,
                    last_status_change_at = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                now,
                now,
                installationId
            );

            this.recordHistory({
                installationId,
                eventType: "installation_cancelled",
                previousStatus: installation.status,
                currentStatus: "archived",
                actorId: cancelledBy,
                reason,
                occurredAt: now
            });
        })();

        return this.getInstallationById(
            installationId
        );
    }

    getHistory(
        installationId,
        limit
    ) {
        return db.prepare(`
            SELECT
                id,
                installation_id,
                event_type,
                previous_status,
                current_status,
                actor_id,
                reason,
                occurred_at
            FROM InstallationValidationHistoryV2
            WHERE installation_id = ?
            ORDER BY
                occurred_at DESC,
                id DESC
            LIMIT ?
        `).all(
            installationId,
            limit
        );
    }

    recordHistory({
        installationId,
        eventType,
        previousStatus = null,
        currentStatus,
        actorId = null,
        reason = null,
        occurredAt
    }) {
        db.prepare(`
            INSERT INTO InstallationValidationHistoryV2 (
                installation_id,
                event_type,
                previous_status,
                current_status,
                actor_id,
                reason,
                occurred_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            installationId,
            eventType,
            previousStatus,
            currentStatus,
            actorId,
            reason,
            occurredAt
        );
    }

    getByValidationMessage(
        guildId,
        channelId,
        messageId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterGuildInstallationsV2
            WHERE guild_id = ?
            AND validation_channel_id = ?
            AND validation_message_id = ?
        `).get(
            guildId,
            channelId,
            messageId
        );
    }

    storeValidationMessage(
        installationId,
        {
            channelId,
            messageId
        }
    ) {
        this.requireInstallation(
            installationId
        );

        const now =
            new Date().toISOString();

        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                validation_channel_id = ?,
                validation_message_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            channelId,
            messageId,
            now,
            installationId
        );

        return this.getInstallationById(
            installationId
        );
    }

    clearValidationMessage(
        installationId
    ) {
        this.requireInstallation(
            installationId
        );

        db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET
                validation_channel_id = NULL,
                validation_message_id = NULL,
                updated_at = ?
            WHERE id = ?
        `).run(
            new Date().toISOString(),
            installationId
        );

        return this.getInstallationById(
            installationId
        );
    }

    submit(
        installationId,
        {
            submittedBy,
            submittedAt
        }
    ) {
        const installation =
            this.requireInstallation(
            installationId
        );

        const now =
            submittedAt ||
            new Date().toISOString();

        db.transaction(
            () => {
                db.prepare(`
                    UPDATE CharacterGuildInstallationsV2
                    SET
                        status = 'pending',
                        proxy_enabled = 0,
                        submitted_by = ?,
                        submitted_at = ?,
                        last_status_change_at = ?,
                        updated_at = ?
                    WHERE id = ?
                `).run(
                    submittedBy,
                    now,
                    now,
                    now,
                    installationId
                );

                this.recordHistory({
                    installationId,
                    eventType: "submitted",
                    previousStatus: installation.status,
                    currentStatus: "pending",
                    actorId: submittedBy,
                    occurredAt: now
                });
            }
        )();

        return this.getInstallationById(
            installationId
        );
    }

    cancelSubmission(
        installationId
    ) {

        const installation =
            this.requireInstallation(
                installationId
            );

        if (
            installation.status !==
            "pending"
        ) {
            return installation;
        }

        const now =
            new Date().toISOString();

        db.transaction(
            () => {
                db.prepare(`
                    UPDATE CharacterGuildInstallationsV2
                    SET
                        status = 'draft',
                        proxy_enabled = 0,
                        submitted_by = NULL,
                        submitted_at = NULL,
                        last_status_change_at = ?,
                        updated_at = ?
                    WHERE id = ?
                    AND status = 'pending'
                `).run(
                    now,
                    now,
                    installationId
                );

                this.recordHistory({
                    installationId,
                    eventType: "submission_cancelled",
                    previousStatus: installation.status,
                    currentStatus: "draft",
                    occurredAt: now
                });
            }
        )();

        return this.getInstallationById(
            installationId
        );

    }

    approve(
        installationId,
        {
            approvedBy,
            approvedAt
        }
    ) {
        const installation =
            this.requireInstallation(
            installationId
        );

        const now =
            approvedAt ||
            new Date().toISOString();

        db.transaction(
            () => {
                const result =
                    db.prepare(`
                    UPDATE CharacterGuildInstallationsV2
                    SET
                        status = 'approved',
                        proxy_enabled = 1,

                        approved_by = ?,
                        approved_at = ?,

                        validated_by = ?,
                        validated_at = ?,

                        last_status_change_at = ?,
                        updated_at = ?

                    WHERE id = ?
                    AND status = 'pending'
                `).run(
                    approvedBy,
                    now,
                    approvedBy,
                    now,
                    now,
                    now,
                    installationId
                );

                if (result.changes !== 1) {
                    throw new Error(
                        "Cette validation a déjà été traitée."
                    );
                }

                this.recordHistory({
                    installationId,
                    eventType: "approved",
                    previousStatus: installation.status,
                    currentStatus: "approved",
                    actorId: approvedBy,
                    occurredAt: now
                });
            }
        )();

        return this.getInstallationById(
            installationId
        );
    }

    reject(
        installationId,
        {
            rejectedBy,
            reason,
            rejectedAt
        }
    ) {
        const installation =
            this.requireInstallation(
            installationId
        );

        const now =
            rejectedAt ||
            new Date().toISOString();

        db.transaction(
            () => {
                const result =
                    db.prepare(`
                    UPDATE CharacterGuildInstallationsV2
                    SET
                        status = 'rejected',
                        proxy_enabled = 0,

                        rejected_by = ?,
                        rejected_at = ?,
                        rejection_reason = ?,

                        last_status_change_at = ?,
                        updated_at = ?

                    WHERE id = ?
                    AND status = 'pending'
                `).run(
                    rejectedBy,
                    now,
                    reason,
                    now,
                    now,
                    installationId
                );

                if (result.changes !== 1) {
                    throw new Error(
                        "Cette validation a déjà été traitée."
                    );
                }

                this.recordHistory({
                    installationId,
                    eventType: "rejected",
                    previousStatus: installation.status,
                    currentStatus: "rejected",
                    actorId: rejectedBy,
                    reason,
                    occurredAt: now
                });
            }
        )();

        return this.getInstallationById(
            installationId
        );
    }

    suspend(
        installationId,
        {
            suspendedBy,
            reason,
            suspendedAt
        }
    ) {
        const installation =
            this.requireInstallation(
            installationId
        );

        const now =
            suspendedAt ||
            new Date().toISOString();

        db.transaction(
            () => {
                db.prepare(`
                    UPDATE CharacterGuildInstallationsV2
                    SET
                        status = 'suspended',
                        proxy_enabled = 0,

                        suspended_by = ?,
                        suspended_at = ?,
                        suspension_reason = ?,

                        last_status_change_at = ?,
                        updated_at = ?

                    WHERE id = ?
                `).run(
                    suspendedBy,
                    now,
                    reason,
                    now,
                    now,
                    installationId
                );

                this.recordHistory({
                    installationId,
                    eventType: "suspended",
                    previousStatus: installation.status,
                    currentStatus: "suspended",
                    actorId: suspendedBy,
                    reason,
                    occurredAt: now
                });
            }
        )();

        return this.getInstallationById(
            installationId
        );
    }

    reopen(
        installationId
    ) {
        const installation =
            this.requireInstallation(
            installationId
        );

        const now =
            new Date().toISOString();

        db.transaction(
            () => {
                db.prepare(`
                    UPDATE CharacterGuildInstallationsV2
                    SET
                        status = 'draft',
                        proxy_enabled = 0,
                        last_status_change_at = ?,
                        updated_at = ?
                    WHERE id = ?
                `).run(
                    now,
                    now,
                    installationId
                );

                this.recordHistory({
                    installationId,
                    eventType: "reopened",
                    previousStatus: installation.status,
                    currentStatus: "draft",
                    occurredAt: now
                });
            }
        )();

        return this.getInstallationById(
            installationId
        );
    }

    archive(
        installationId
    ) {
        const installation =
            this.requireInstallation(
            installationId
        );

        const now =
            new Date().toISOString();

        db.transaction(
            () => {
                db.prepare(`
                    UPDATE CharacterGuildInstallationsV2
                    SET
                        status = 'archived',
                        proxy_enabled = 0,
                        last_status_change_at = ?,
                        updated_at = ?
                    WHERE id = ?
                `).run(
                    now,
                    now,
                    installationId
                );

                this.recordHistory({
                    installationId,
                    eventType: "archived",
                    previousStatus: installation.status,
                    currentStatus: "archived",
                    occurredAt: now
                });
            }
        )();

        return this.getInstallationById(
            installationId
        );
    }

    countApprovedInstallationsForCharacterOnGuild(
        characterId,
        guildId
    ) {
        const result =
            db.prepare(`
                SELECT COUNT(*) AS total
                FROM CharacterGuildInstallationsV2
                WHERE character_id = ?
                AND guild_id = ?
                AND status = 'approved'
            `).get(
                characterId,
                guildId
            );

        return result?.total || 0;
    }

    countApprovedInstallationsForContinuity(
        continuityId
    ) {
        const result =
            db.prepare(`
                SELECT COUNT(*) AS total
                FROM CharacterGuildInstallationsV2
                WHERE continuity_id = ?
                AND status = 'approved'
            `).get(
                continuityId
            );

        return result?.total || 0;
    }
}

module.exports =
    new ValidationRepository();
