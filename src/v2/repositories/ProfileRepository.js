const db =
    require(
        "../../database/database"
    );

const PROFILE_FIELDS = [
    "firstname",
    "lastname",
    "age",
    "gender",
    "height",
    "weight",
    "birthday",
    "origin",
    "occupation",
    "gang",
    "faceclaim",
    "story"
];

class ProfileRepository {

    get(
        continuityId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterProfilesV2
            WHERE continuity_id = ?
        `).get(
            continuityId
        );
    }

    insert(
        continuityId,
        profile,
        createdAt
    ) {
        db.prepare(`
            INSERT INTO CharacterProfilesV2 (
                continuity_id,
                firstname,
                lastname,
                age,
                gender,
                height,
                weight,
                birthday,
                origin,
                occupation,
                gang,
                faceclaim,
                story,
                created_at,
                updated_at
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?
            )
        `).run(
            continuityId,
            ...PROFILE_FIELDS.map(
                field =>
                    profile[field]
            ),
            createdAt,
            createdAt
        );

        return this.get(
            continuityId
        );
    }

    update(
        continuityId,
        profile,
        updatedAt
    ) {
        db.prepare(`
            UPDATE CharacterProfilesV2
            SET
                firstname = ?,
                lastname = ?,
                age = ?,
                gender = ?,
                height = ?,
                weight = ?,
                birthday = ?,
                origin = ?,
                occupation = ?,
                gang = ?,
                faceclaim = ?,
                story = ?,
                updated_at = ?
            WHERE continuity_id = ?
        `).run(
            ...PROFILE_FIELDS.map(
                field =>
                    profile[field]
            ),
            updatedAt,
            continuityId
        );

        return this.get(
            continuityId
        );
    }

}

module.exports = {
    PROFILE_FIELDS,
    repository:
        new ProfileRepository()
};
