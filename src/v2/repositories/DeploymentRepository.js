const db =
    require(
        "../../database/database"
    );

class DeploymentRepository {

    getDeployableSources(
        guildId
    ) {
        return db.prepare(`
            SELECT
                continuity.id,
                continuity.character_id,
                continuity.name,
                continuity.mode,
                continuity.firstname,
                continuity.lastname,

                character.proxy_name,
                character.avatar_url,
                character.character_type

            FROM CharactersV2 AS character

            JOIN CharacterContinuitiesV2
                AS continuity
                ON continuity.character_id =
                    character.id

            WHERE character.is_archived = 0
            AND continuity.is_archived = 0
            AND continuity.id = (
                SELECT candidate.id
                FROM CharacterContinuitiesV2
                    AS candidate
                WHERE candidate.character_id =
                    character.id
                AND candidate.is_archived = 0
                ORDER BY
                    CASE
                        WHEN candidate.mode =
                            'original'
                        THEN 0
                        ELSE 1
                    END,
                    candidate.created_at ASC,
                    candidate.id ASC
                LIMIT 1
            )
            AND NOT EXISTS (
                SELECT 1
                FROM CharacterGuildInstallationsV2
                    AS installation
                WHERE installation.guild_id = ?
                AND installation.character_id =
                    character.id
            )

            ORDER BY
                character.proxy_name
                    COLLATE NOCASE ASC,
                continuity.name
                    COLLATE NOCASE ASC
        `).all(
            guildId
        );
    }

    getOwnedSource(
        sourceContinuityId,
        discordUserId
    ) {
        return db.prepare(`
            SELECT
                continuity.*,

                character.proxy_name,
                character.avatar_url,
                character.base_firstname,
                character.base_lastname,
                character.is_archived
                    AS character_is_archived,

                user.discord_user_id

            FROM CharacterContinuitiesV2
                AS continuity

            JOIN CharactersV2 AS character
                ON character.id =
                    continuity.character_id

            JOIN UsersV2 AS user
                ON user.id =
                    character.owner_user_id

            WHERE continuity.id = ?
            AND user.discord_user_id = ?
        `).get(
            sourceContinuityId,
            discordUserId
        );
    }

    getCharacter(
        characterId
    ) {
        return db.prepare(`
            SELECT
                character.*,
                user.discord_user_id

            FROM CharactersV2 AS character

            JOIN UsersV2 AS user
                ON user.id =
                    character.owner_user_id

            WHERE character.id = ?
        `).get(
            characterId
        );
    }

}

module.exports =
    new DeploymentRepository();
