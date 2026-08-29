const db =
    require(
        "../../database/database"
    );

const InstallationStatus =
    require(
        "../core/constants/InstallationStatus"
    );

db.function(
    "greycore_lower",
    {
        deterministic:
            true
    },
    value =>
        String(value || "")
            .toLowerCase()
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

    searchOwnedPlayableCharacters({
        discordUserId,
        guildId,
        query,
        limit = 25
    }) {
        const normalizedLimit =
            Math.max(
                0,
                Math.min(
                    25,
                    Number(limit) || 0
                )
            );

        if (!normalizedLimit) {
            return [];
        }

        return db.prepare(`
            SELECT character.*
            FROM CharactersV2 AS character
            JOIN UsersV2 AS user
                ON user.id = character.owner_user_id
            WHERE user.discord_user_id = ?
            AND character.is_archived = 0
            AND INSTR(
                greycore_lower(character.proxy_name),
                ?
            ) > 0
            AND EXISTS (
                SELECT 1
                FROM CharacterGuildInstallationsV2 AS installation
                WHERE installation.character_id = character.id
                AND installation.guild_id = ?
                AND installation.status = ?
                AND installation.proxy_enabled = 1
            )
            ORDER BY
                character.proxy_name COLLATE NOCASE ASC,
                character.id ASC
            LIMIT ?
        `).all(
            String(discordUserId),
            String(query || "").toLowerCase(),
            String(guildId),
            InstallationStatus.APPROVED,
            normalizedLimit
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

    getPlayedCreationDatesForGuildSince(
        discordUserId,
        guildId,
        since
    ) {
        return db.prepare(`
            SELECT character.created_at
            FROM CharactersV2 AS character
            JOIN UsersV2 AS user
                ON user.id = character.owner_user_id
            JOIN CharacterGuildInstallationsV2 AS installation
                ON installation.character_id = character.id
            WHERE user.discord_user_id = ?
            AND character.character_type = 'personnage_joue'
            AND character.created_at >= ?
            AND installation.guild_id = ?
            AND installation.id = (
                SELECT MIN(firstInstallation.id)
                FROM CharacterGuildInstallationsV2 AS firstInstallation
                WHERE firstInstallation.character_id = character.id
            )
            ORDER BY character.created_at ASC
        `).all(
            discordUserId,
            since,
            guildId
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
                masked_parent_character_id,
                is_archived,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.id,
            data.ownerUserId,
            data.proxyName,
            data.avatarUrl,
            data.baseFirstname,
            data.baseLastname,
            data.characterType,
            data.maskedParentCharacterId || null,
            data.isArchived,
            data.createdAt,
            data.updatedAt
        );

        return this.getById(
            data.id
        );
    }

    setMaskedParent(characterId, parentCharacterId, updatedAt) {
        db.prepare(`
            UPDATE CharactersV2
            SET masked_parent_character_id = ?, updated_at = ?
            WHERE id = ?
        `).run(parentCharacterId, updatedAt, characterId);
        return this.getById(characterId);
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
