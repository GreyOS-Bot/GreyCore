const db =
    require(
        "../../database/database"
    );

class DeploymentRepository {

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
