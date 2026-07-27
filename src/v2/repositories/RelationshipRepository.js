const db =
    require(
        "../../database/database"
    );

const SELECT_RELATIONSHIP = `
    SELECT
        relationship.*,
        relationshipType.key,
        relationshipType.label_a_to_b,
        relationshipType.label_b_to_a,
        relationshipType.is_symmetric,
        COALESCE(
            NULLIF(
                TRIM(
                    COALESCE(
                        characterA.base_firstname,
                        ''
                    )
                    || ' '
                    || COALESCE(
                        characterA.base_lastname,
                        ''
                    )
                ),
                ''
            ),
            characterA.proxy_name
        ) AS character_a_name,
        COALESCE(
            NULLIF(
                TRIM(
                    COALESCE(
                        characterB.base_firstname,
                        ''
                    )
                    || ' '
                    || COALESCE(
                        characterB.base_lastname,
                        ''
                    )
                ),
                ''
            ),
            characterB.proxy_name
        ) AS character_b_name
    FROM ContinuityRelationshipsV2
        AS relationship
    JOIN RelationshipTypes
        AS relationshipType
        ON relationshipType.id =
            relationship.relationship_type_id
    JOIN CharactersV2
        AS characterA
        ON characterA.id =
            relationship.character_a_id
    JOIN CharactersV2
        AS characterB
        ON characterB.id =
            relationship.character_b_id
`;

class RelationshipRepository {

    getById(
        relationshipId
    ) {
        return db.prepare(`
            ${SELECT_RELATIONSHIP}
            WHERE relationship.id = ?
        `).get(
            relationshipId
        );
    }

    getForContinuity(
        continuityId
    ) {
        return db.prepare(`
            ${SELECT_RELATIONSHIP}
            WHERE (
                relationship.continuity_a_id = ?
                OR relationship.continuity_b_id = ?
            )
            AND relationship.ended_at IS NULL
            ORDER BY
                relationship.started_at DESC,
                relationship.created_at DESC,
                relationship.id DESC
        `).all(
            continuityId,
            continuityId
        );
    }

    findActive({
        continuityAId,
        continuityBId,
        relationshipTypeId
    }) {
        return db.prepare(`
            SELECT id
            FROM ContinuityRelationshipsV2
            WHERE relationship_type_id = ?
            AND ended_at IS NULL
            AND (
                (
                    continuity_a_id = ?
                    AND continuity_b_id = ?
                )
                OR (
                    continuity_a_id = ?
                    AND continuity_b_id = ?
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
                INSERT INTO ContinuityRelationshipsV2 (
                    guild_id,
                    character_a_id,
                    continuity_a_id,
                    character_b_id,
                    continuity_b_id,
                    relationship_type_id,
                    note,
                    started_at,
                    ended_at,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, NULL, ?, ?, ?
                )
            `).run(
                data.guildId,
                data.characterAId,
                data.continuityAId,
                data.characterBId,
                data.continuityBId,
                data.relationshipTypeId,
                data.note,
                data.startedAt,
                data.createdBy,
                data.createdAt,
                data.updatedAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    update(
        relationshipId,
        data
    ) {
        db.prepare(`
            UPDATE ContinuityRelationshipsV2
            SET
                note = ?,
                started_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.note,
            data.startedAt,
            data.updatedAt,
            relationshipId
        );

        return this.getById(
            relationshipId
        );
    }

    end(
        relationshipId,
        endedAt
    ) {
        db.prepare(`
            UPDATE ContinuityRelationshipsV2
            SET
                ended_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            endedAt,
            endedAt,
            relationshipId
        );

        return this.getById(
            relationshipId
        );
    }

    delete(
        relationshipId
    ) {
        return db.prepare(`
            DELETE FROM ContinuityRelationshipsV2
            WHERE id = ?
        `).run(
            relationshipId
        );
    }

}

module.exports =
    new RelationshipRepository();
