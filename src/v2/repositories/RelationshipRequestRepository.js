const db =
    require(
        "../../database/database"
    );

class RelationshipRequestRepository {

    getById(
        requestId
    ) {
        return db.prepare(`
            SELECT
                request.*,
                relationshipType.guild_id,
                relationshipType.label_a_to_b,
                relationshipType.label_b_to_a,
                relationshipType.is_symmetric,
                requesterContinuity.character_id
                    AS requester_character_id,
                targetContinuity.character_id
                    AS target_character_id,
                requesterCharacter.proxy_name
                    AS requester_character_name,
                targetCharacter.proxy_name
                    AS target_character_name,
                requesterOwner.discord_user_id
                    AS requester_owner_id,
                targetOwner.discord_user_id
                    AS current_target_owner_id
            FROM PendingContinuityRelationshipsV2
                AS request
            JOIN RelationshipTypes
                AS relationshipType
                ON relationshipType.id =
                    request.relationship_type_id
            JOIN CharacterContinuitiesV2
                AS requesterContinuity
                ON requesterContinuity.id =
                    request.requester_continuity_id
            JOIN CharacterContinuitiesV2
                AS targetContinuity
                ON targetContinuity.id =
                    request.target_continuity_id
            JOIN CharactersV2
                AS requesterCharacter
                ON requesterCharacter.id =
                    requesterContinuity.character_id
            JOIN CharactersV2
                AS targetCharacter
                ON targetCharacter.id =
                    targetContinuity.character_id
            JOIN UsersV2
                AS requesterOwner
                ON requesterOwner.id =
                    requesterCharacter.owner_user_id
            JOIN UsersV2
                AS targetOwner
                ON targetOwner.id =
                    targetCharacter.owner_user_id
            WHERE request.id = ?
        `).get(
            requestId
        );
    }

    findPending({
        continuityAId,
        continuityBId,
        relationshipTypeId
    }) {
        return db.prepare(`
            SELECT id
            FROM PendingContinuityRelationshipsV2
            WHERE relationship_type_id = ?
            AND status = 'pending'
            AND (
                (
                    requester_continuity_id = ?
                    AND target_continuity_id = ?
                )
                OR (
                    requester_continuity_id = ?
                    AND target_continuity_id = ?
                )
            )
        `).get(
            relationshipTypeId,
            continuityAId,
            continuityBId,
            continuityBId,
            continuityAId
        );
    }

    insert(
        data
    ) {
        const result =
            db.prepare(`
                INSERT INTO PendingContinuityRelationshipsV2 (
                    requester_continuity_id,
                    target_continuity_id,
                    relationship_type_id,
                    requested_by,
                    target_owner_id,
                    note,
                    started_at,
                    status,
                    created_at
                )
                VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, 'pending', ?
                )
            `).run(
                data.requesterContinuityId,
                data.targetContinuityId,
                data.relationshipTypeId,
                data.requestedBy,
                data.targetOwnerId,
                data.note,
                data.startedAt,
                data.createdAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    respond(
        requestId,
        status,
        respondedBy,
        respondedAt
    ) {
        db.prepare(`
            UPDATE PendingContinuityRelationshipsV2
            SET
                status = ?,
                responded_at = ?,
                responded_by = ?
            WHERE id = ?
            AND status = 'pending'
        `).run(
            status,
            respondedAt,
            respondedBy,
            requestId
        );

        return this.getById(
            requestId
        );
    }

    deletePending(
        requestId
    ) {
        return db.prepare(`
            DELETE FROM PendingContinuityRelationshipsV2
            WHERE id = ?
            AND status = 'pending'
        `).run(
            requestId
        );
    }

}

module.exports =
    new RelationshipRequestRepository();
