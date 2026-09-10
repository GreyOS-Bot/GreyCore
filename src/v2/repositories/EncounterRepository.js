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
        void data;
        throw new Error("ContinuityEncountersV2 est une archive legacy en lecture seule.");
    }

    update(
        encounterId,
        data
    ) {
        void encounterId;
        void data;
        throw new Error("ContinuityEncountersV2 est une archive legacy en lecture seule.");
    }

    delete(
        encounterId
    ) {
        void encounterId;
        throw new Error("ContinuityEncountersV2 est une archive legacy en lecture seule.");
    }

}

module.exports =
    new EncounterRepository();
