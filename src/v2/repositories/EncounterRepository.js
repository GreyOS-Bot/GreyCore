const db =
    require(
        "../../database/database"
    );

class EncounterRepository {

    getById(
        encounterId
    ) {
        return db.prepare(`
            SELECT *
            FROM ContinuityEncountersV2
            WHERE id = ?
        `).get(
            encounterId
        );
    }

    getForContinuity(
        continuityId
    ) {
        return db.prepare(`
            SELECT
                encounter.*,
                otherContinuity.id
                    AS other_continuity_id,
                otherCharacter.proxy_name
                    AS other_character_name,
                otherProfile.firstname
                    AS other_firstname,
                otherProfile.lastname
                    AS other_lastname
            FROM ContinuityEncountersV2
                AS encounter
            LEFT JOIN CharacterContinuitiesV2
                AS otherContinuity
                ON otherContinuity.id =
                    CASE
                        WHEN encounter.continuity_a_id = ?
                            THEN encounter.continuity_b_id
                        ELSE encounter.continuity_a_id
                    END
            LEFT JOIN CharactersV2
                AS otherCharacter
                ON otherCharacter.id =
                    otherContinuity.character_id
            LEFT JOIN CharacterProfilesV2
                AS otherProfile
                ON otherProfile.continuity_id =
                    otherContinuity.id
            WHERE encounter.continuity_a_id = ?
            OR encounter.continuity_b_id = ?
            ORDER BY
                encounter.occurred_at DESC,
                encounter.id DESC
        `).all(
            continuityId,
            continuityId,
            continuityId
        );
    }

    getContinuityById(
        continuityId
    ) {
        return db.prepare(`
            SELECT id
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
                INSERT INTO ContinuityEncountersV2 (
                    continuity_a_id,
                    continuity_b_id,
                    external_name,
                    location,
                    note,
                    occurred_at,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.continuityAId,
                data.continuityBId,
                data.externalName,
                data.location,
                data.note,
                data.occurredAt,
                data.createdBy,
                data.createdAt,
                data.updatedAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    update(
        encounterId,
        data
    ) {
        db.prepare(`
            UPDATE ContinuityEncountersV2
            SET
                external_name = ?,
                location = ?,
                note = ?,
                occurred_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.externalName,
            data.location,
            data.note,
            data.occurredAt,
            data.updatedAt,
            encounterId
        );

        return this.getById(
            encounterId
        );
    }

    delete(
        encounterId
    ) {
        return db.prepare(`
            DELETE FROM ContinuityEncountersV2
            WHERE id = ?
        `).run(
            encounterId
        );
    }

}

module.exports =
    new EncounterRepository();
