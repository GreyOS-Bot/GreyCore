const db =
    require(
        "../../database/database"
    );

class CharacterChangeRequestRepository {
    getById(requestId) {
        return db.prepare(`
            SELECT *
            FROM CharacterChangeRequestsV2
            WHERE id = ?
        `).get(requestId);
    }

    requireById(requestId) {
        const request = this.getById(requestId);

        if (!request) {
            throw new Error(
                "Demande de modification introuvable."
            );
        }

        return request;
    }

    getPending(installationId, requestType) {
        return db.prepare(`
            SELECT *
            FROM CharacterChangeRequestsV2
            WHERE installation_id = ?
            AND request_type = ?
            AND status = 'pending'
        `).get(
            installationId,
            requestType
        );
    }

    create(data) {
        const result = db.prepare(`
            INSERT INTO CharacterChangeRequestsV2 (
                installation_id,
                character_id,
                continuity_id,
                request_type,
                changes_json,
                status,
                submitted_by,
                submitted_at,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `).run(
            data.installationId,
            data.characterId,
            data.continuityId,
            data.requestType,
            data.changesJson,
            data.submittedBy,
            data.submittedAt,
            data.createdAt,
            data.updatedAt
        );

        return this.getById(
            result.lastInsertRowid
        );
    }

    storeValidationMessage(requestId, data) {
        this.requireById(requestId);

        db.prepare(`
            UPDATE CharacterChangeRequestsV2
            SET
                validation_channel_id = ?,
                validation_message_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.channelId,
            data.messageId,
            data.updatedAt,
            requestId
        );

        return this.getById(requestId);
    }

    approve(requestId, data) {
        this.requireById(requestId);

        db.prepare(`
            UPDATE CharacterChangeRequestsV2
            SET
                status = 'approved',
                reviewed_by = ?,
                reviewed_at = ?,
                rejection_reason = NULL,
                updated_at = ?
            WHERE id = ?
            AND status = 'pending'
        `).run(
            data.reviewedBy,
            data.reviewedAt,
            data.updatedAt,
            requestId
        );

        return this.getById(requestId);
    }

    reject(requestId, data) {
        this.requireById(requestId);

        db.prepare(`
            UPDATE CharacterChangeRequestsV2
            SET
                status = 'rejected',
                reviewed_by = ?,
                reviewed_at = ?,
                rejection_reason = ?,
                updated_at = ?
            WHERE id = ?
            AND status = 'pending'
        `).run(
            data.reviewedBy,
            data.reviewedAt,
            data.reason,
            data.updatedAt,
            requestId
        );

        return this.getById(requestId);
    }

    cancel(requestId, updatedAt) {
        db.prepare(`
            UPDATE CharacterChangeRequestsV2
            SET
                status = 'cancelled',
                updated_at = ?
            WHERE id = ?
            AND status = 'pending'
        `).run(
            updatedAt,
            requestId
        );

        return this.getById(requestId);
    }

    getContext(requestId) {
        return db.prepare(`
            SELECT
                request.*,

                installation.guild_id,
                installation.status
                    AS installation_status,
                installation.local_avatar_url,

                character.proxy_name,
                character.avatar_url
                    AS global_avatar_url,

                owner.discord_user_id
                    AS owner_id,

                profile.firstname,
                profile.lastname,
                profile.age,
                profile.birthday,
                profile.origin,
                profile.occupation,
                profile.gang,
                profile.story

            FROM CharacterChangeRequestsV2 AS request

            JOIN CharacterGuildInstallationsV2
                AS installation
                ON installation.id = request.installation_id

            JOIN CharactersV2 AS character
                ON character.id = request.character_id

            JOIN UsersV2 AS owner
                ON owner.id = character.owner_user_id

            LEFT JOIN CharacterProfilesV2 AS profile
                ON profile.continuity_id = request.continuity_id

            WHERE request.id = ?
        `).get(requestId);
    }
}

module.exports =
    new CharacterChangeRequestRepository();
