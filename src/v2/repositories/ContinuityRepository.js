const db =
    require(
        "../../database/database"
    );

class ContinuityRepository {

    getById(
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

    getByCharacter(
        characterId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterContinuitiesV2
            WHERE character_id = ?
            ORDER BY created_at ASC
        `).all(
            characterId
        );
    }

    getByCharacterAndName(
        characterId,
        name
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterContinuitiesV2
            WHERE character_id = ?
            AND LOWER(name) = LOWER(?)
        `).get(
            characterId,
            name
        );
    }

    insert(
        data
    ) {
        db.prepare(`
            INSERT INTO CharacterContinuitiesV2 (
                id,
                character_id,
                name,
                mode,
                source_continuity_id,
                firstname,
                lastname,
                age,
                gang,
                story,
                is_archived,
                created_at,
                updated_at
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?
            )
        `).run(
            data.id,
            data.characterId,
            data.name,
            data.mode,
            data.sourceContinuityId,
            data.firstname,
            data.lastname,
            data.age,
            data.gang,
            data.story,
            data.isArchived,
            data.createdAt,
            data.updatedAt
        );

        return this.getById(
            data.id
        );
    }

    updateProfile(
        continuityId,
        data
    ) {
        db.prepare(`
            UPDATE CharacterContinuitiesV2
            SET
                name = ?,
                firstname = ?,
                lastname = ?,
                age = ?,
                gang = ?,
                story = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.name,
            data.firstname,
            data.lastname,
            data.age,
            data.gang,
            data.story,
            data.updatedAt,
            continuityId
        );

        return this.getById(
            continuityId
        );
    }

    setArchived(
        continuityId,
        archived,
        updatedAt
    ) {
        db.prepare(`
            UPDATE CharacterContinuitiesV2
            SET
                is_archived = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            archived,
            updatedAt,
            continuityId
        );

        return this.getById(
            continuityId
        );
    }

    deleteCascade(
        continuity
    ) {
        const remove =
            db.transaction(
                () => {
                    const installationCount =
                        db.prepare(`
                            SELECT COUNT(*)
                                AS total
                            FROM CharacterGuildInstallationsV2
                            WHERE continuity_id = ?
                        `).get(
                            continuity.id
                        ).total;

                    db.prepare(`
                        DELETE FROM MigrationV1ToV2
                        WHERE new_id = ?
                        OR new_id IN (
                            SELECT CAST(id AS TEXT)
                            FROM CharacterGuildInstallationsV2
                            WHERE continuity_id = ?
                        )
                    `).run(
                        continuity.id,
                        continuity.id
                    );

                    db.prepare(`
                        DELETE FROM CharacterContinuitiesV2
                        WHERE id = ?
                    `).run(
                        continuity.id
                    );

                    return {
                        continuity,
                        installationCount:
                            Number(
                                installationCount
                            )
                    };
                }
            );

        return remove();
    }

}

module.exports =
    new ContinuityRepository();
