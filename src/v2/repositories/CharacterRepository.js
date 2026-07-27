const db =
    require(
        "../../database/database"
    );

class CharacterRepository {

    getById(
        characterId
    ) {
        return db.prepare(`
            SELECT
                character.*,
                user.discord_user_id
            FROM CharactersV2
                AS character
            JOIN UsersV2
                AS user
                ON user.id =
                    character.owner_user_id
            WHERE character.id = ?
        `).get(
            characterId
        );
    }

    getByOwner(
        ownerUserId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharactersV2
            WHERE owner_user_id = ?
            ORDER BY
                proxy_name COLLATE NOCASE
                    ASC
        `).all(
            ownerUserId
        );
    }

    getByOwnerDiscordId(
        discordUserId
    ) {
        return db.prepare(`
            SELECT
                character.*,
                user.discord_user_id
            FROM CharactersV2
                AS character
            JOIN UsersV2
                AS user
                ON user.id =
                    character.owner_user_id
            WHERE user.discord_user_id = ?
            ORDER BY
                character.proxy_name
                    COLLATE NOCASE ASC
        `).all(
            discordUserId
        );
    }

    getByProxyName(
        ownerUserId,
        proxyName
    ) {
        return db.prepare(`
            SELECT *
            FROM CharactersV2
            WHERE owner_user_id = ?
            AND LOWER(proxy_name) =
                LOWER(?)
        `).get(
            ownerUserId,
            proxyName
        );
    }

    insert(
        data
    ) {
        db.prepare(`
            INSERT INTO CharactersV2 (
                id,
                owner_user_id,
                proxy_name,
                avatar_url,
                base_firstname,
                base_lastname,
                character_type,
                is_archived,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.id,
            data.ownerUserId,
            data.proxyName,
            data.avatarUrl,
            data.baseFirstname,
            data.baseLastname,
            data.characterType,
            data.isArchived,
            data.createdAt,
            data.updatedAt
        );

        return this.getById(
            data.id
        );
    }

    updateIdentity(
        characterId,
        data
    ) {
        db.prepare(`
            UPDATE CharactersV2
            SET
                proxy_name = ?,
                avatar_url = ?,
                base_firstname = ?,
                base_lastname = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.proxyName,
            data.avatarUrl,
            data.baseFirstname,
            data.baseLastname,
            data.updatedAt,
            characterId
        );

        return this.getById(
            characterId
        );
    }

    setArchived(
        characterId,
        archived,
        updatedAt
    ) {
        db.prepare(`
            UPDATE CharactersV2
            SET
                is_archived = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            archived,
            updatedAt,
            characterId
        );

        return this.getById(
            characterId
        );
    }

    deleteCascade(
        character
    ) {
        const remove =
            db.transaction(
                () => {
                    const continuityCount =
                        db.prepare(`
                            SELECT COUNT(*)
                                AS total
                            FROM CharacterContinuitiesV2
                            WHERE character_id = ?
                        `).get(
                            character.id
                        ).total;

                    const installationCount =
                        db.prepare(`
                            SELECT COUNT(*)
                                AS total
                            FROM CharacterGuildInstallationsV2
                            WHERE character_id = ?
                        `).get(
                            character.id
                        ).total;

                    db.prepare(`
                        DELETE FROM MigrationV1ToV2
                        WHERE new_id = ?
                        OR new_id IN (
                            SELECT id
                            FROM CharacterContinuitiesV2
                            WHERE character_id = ?
                        )
                        OR new_id IN (
                            SELECT CAST(id AS TEXT)
                            FROM CharacterGuildInstallationsV2
                            WHERE character_id = ?
                        )
                    `).run(
                        character.id,
                        character.id,
                        character.id
                    );

                    db.prepare(`
                        DELETE FROM CharactersV2
                        WHERE id = ?
                    `).run(
                        character.id
                    );

                    return {
                        character,
                        continuityCount:
                            Number(
                                continuityCount
                            ),
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
    new CharacterRepository();
