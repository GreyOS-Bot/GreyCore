const db =
    require(
        "../../database/database"
    );

const CHARACTER_COUNTS = `
    COUNT(
        DISTINCT continuity.id
    ) AS continuity_count,

    COUNT(
        DISTINCT installation.id
    ) AS installation_count
`;

class LibraryRepository {

    getCharacters(
        userId
    ) {
        return db.prepare(`
            SELECT
                character.id,
                character.owner_user_id,
                character.proxy_name,
                COALESCE(
                    NULLIF(TRIM(profile.alias), ''),
                    NULLIF(TRIM(character.base_firstname), ''),
                    character.proxy_name
                ) AS display_name,
                character.avatar_url,
                character.base_firstname,
                character.base_lastname,
                character.is_archived,
                character.created_at,
                character.updated_at,
                ${CHARACTER_COUNTS}

            FROM CharactersV2 character

            LEFT JOIN CharacterContinuitiesV2 continuity
                ON continuity.character_id =
                    character.id

            LEFT JOIN CharacterGuildInstallationsV2 installation
                ON installation.character_id =
                    character.id
                AND installation.status != 'archived'

            LEFT JOIN CharacterProfilesV2 profile
                ON profile.continuity_id =
                    continuity.id

            WHERE character.owner_user_id = ?
            AND character.is_archived = 0

            GROUP BY character.id

            ORDER BY
                display_name
                COLLATE NOCASE ASC
        `).all(
            userId
        );
    }

    getArchivedCharacters(
        userId
    ) {
        return db.prepare(`
            SELECT
                character.id,
                character.owner_user_id,
                character.proxy_name,
                COALESCE(
                    NULLIF(TRIM(profile.alias), ''),
                    NULLIF(TRIM(character.base_firstname), ''),
                    character.proxy_name
                ) AS display_name,
                character.avatar_url,
                character.base_firstname,
                character.base_lastname,
                character.is_archived,
                character.created_at,
                character.updated_at,
                ${CHARACTER_COUNTS}

            FROM CharactersV2 character

            LEFT JOIN CharacterContinuitiesV2 continuity
                ON continuity.character_id =
                    character.id

            LEFT JOIN CharacterGuildInstallationsV2 installation
                ON installation.character_id =
                    character.id

            LEFT JOIN CharacterProfilesV2 profile
                ON profile.continuity_id =
                    continuity.id

            WHERE character.owner_user_id = ?
            AND character.is_archived = 1

            GROUP BY character.id

            ORDER BY
                display_name
                COLLATE NOCASE ASC
        `).all(
            userId
        );
    }

    getCharacter(
        characterId
    ) {
        return db.prepare(`
            SELECT
                character.*,
                user.discord_user_id,
                ${CHARACTER_COUNTS}

            FROM CharactersV2 character

            JOIN UsersV2 user
                ON user.id =
                    character.owner_user_id

            LEFT JOIN CharacterContinuitiesV2 continuity
                ON continuity.character_id =
                    character.id

            LEFT JOIN CharacterGuildInstallationsV2 installation
                ON installation.character_id =
                    character.id
                AND installation.status != 'archived'

            WHERE character.id = ?

            GROUP BY character.id
        `).get(
            characterId
        );
    }

    getCharacterForUser(
        characterId,
        userId
    ) {
        return db.prepare(`
            SELECT
                character.*,
                ${CHARACTER_COUNTS}

            FROM CharactersV2 character

            LEFT JOIN CharacterContinuitiesV2 continuity
                ON continuity.character_id =
                    character.id

            LEFT JOIN CharacterGuildInstallationsV2 installation
                ON installation.character_id =
                    character.id
                AND installation.status != 'archived'

            WHERE character.id = ?
            AND character.owner_user_id = ?

            GROUP BY character.id
        `).get(
            characterId,
            userId
        );
    }

    searchCharacters(
        userId,
        cleanSearch
    ) {
        const searchValue =
            `%${cleanSearch}%`;

        return db.prepare(`
            SELECT
                character.id,
                character.owner_user_id,
                character.proxy_name,
                COALESCE(
                    NULLIF(TRIM(profile.alias), ''),
                    NULLIF(TRIM(character.base_firstname), ''),
                    character.proxy_name
                ) AS display_name,
                character.avatar_url,
                character.base_firstname,
                character.base_lastname,
                character.is_archived,
                ${CHARACTER_COUNTS}

            FROM CharactersV2 character

            LEFT JOIN CharacterContinuitiesV2 continuity
                ON continuity.character_id =
                    character.id

            LEFT JOIN CharacterGuildInstallationsV2 installation
                ON installation.character_id =
                    character.id
                AND installation.status != 'archived'

            LEFT JOIN CharacterProfilesV2 profile
                ON profile.continuity_id =
                    continuity.id

            WHERE character.owner_user_id = ?
            AND character.is_archived = 0
            AND (
                LOWER(character.proxy_name)
                    LIKE LOWER(?)

                OR LOWER(
                    COALESCE(
                        character.base_firstname,
                        ''
                    )
                ) LIKE LOWER(?)

                OR LOWER(
                    COALESCE(
                        character.base_lastname,
                        ''
                    )
                ) LIKE LOWER(?)

                OR LOWER(
                    COALESCE(
                        profile.alias,
                        ''
                    )
                ) LIKE LOWER(?)
            )

            GROUP BY character.id

            ORDER BY
                display_name
                COLLATE NOCASE ASC
        `).all(
            userId,
            searchValue,
            searchValue,
            searchValue,
            searchValue
        );
    }

    getContinuities(
        characterId
    ) {
        return db.prepare(`
            SELECT
                continuity.*,

                COUNT(
                    DISTINCT installation.id
                ) AS installation_count

            FROM CharacterContinuitiesV2 continuity

            LEFT JOIN CharacterGuildInstallationsV2 installation
                ON installation.continuity_id =
                    continuity.id
                AND installation.status != 'archived'

            WHERE continuity.character_id = ?

            GROUP BY continuity.id

            ORDER BY
                continuity.created_at ASC
        `).all(
            characterId
        );
    }

    getStatistics(
        userId
    ) {
        const characters =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM CharactersV2
                WHERE owner_user_id = ?
                AND is_archived = 0
            `).get(
                userId
            );

        const archived =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM CharactersV2
                WHERE owner_user_id = ?
                AND is_archived = 1
            `).get(
                userId
            );

        const continuities =
            db.prepare(`
                SELECT COUNT(*) AS count

                FROM CharacterContinuitiesV2 continuity

                JOIN CharactersV2 character
                    ON character.id =
                        continuity.character_id

                WHERE character.owner_user_id = ?
                AND continuity.is_archived = 0
            `).get(
                userId
            );

        const installations =
            db.prepare(`
                SELECT COUNT(*) AS count

                FROM CharacterGuildInstallationsV2 installation

                JOIN CharactersV2 character
                    ON character.id =
                        installation.character_id

                WHERE character.owner_user_id = ?
                AND installation.status != 'archived'
            `).get(
                userId
            );

        return {
            characters:
                characters?.count
                || 0,
            archived:
                archived?.count
                || 0,
            continuities:
                continuities?.count
                || 0,
            installations:
                installations?.count
                || 0
        };
    }

}

module.exports =
    new LibraryRepository();
