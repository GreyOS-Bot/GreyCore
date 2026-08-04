const db = require("../../database/database");

class CharacterTypeCorrectionRepository {
    getContext({
        guildId,
        discordUserId,
        characterId
    }) {
        return db.prepare(`
            SELECT
                character.id,
                character.proxy_name,
                character.character_type,
                character.base_firstname,
                character.base_lastname,
                user.discord_user_id,
                installation.continuity_id,
                COALESCE(
                    NULLIF(profile.alias, ''),
                    NULLIF(profile.firstname, ''),
                    NULLIF(continuity.firstname, ''),
                    NULLIF(character.base_firstname, ''),
                    character.proxy_name
                ) AS firstname
            FROM CharactersV2 AS character
            JOIN UsersV2 AS user
                ON user.id = character.owner_user_id
            JOIN CharacterGuildInstallationsV2 AS installation
                ON installation.character_id = character.id
                AND installation.guild_id = ?
            JOIN CharacterContinuitiesV2 AS continuity
                ON continuity.id = installation.continuity_id
            LEFT JOIN CharacterProfilesV2 AS profile
                ON profile.continuity_id = continuity.id
            WHERE character.id = ?
            AND user.discord_user_id = ?
            LIMIT 1
        `).get(
            guildId,
            characterId,
            discordUserId
        );
    }

    correctType({
        characterId,
        characterType,
        visibility,
        updatedAt
    }) {
        db.transaction(() => {
            db.prepare(`
                UPDATE CharactersV2
                SET character_type = ?, updated_at = ?
                WHERE id = ?
            `).run(
                characterType,
                updatedAt,
                characterId
            );

            db.prepare(`
                UPDATE CharacterGuildInstallationsV2
                SET visibility = ?, updated_at = ?
                WHERE character_id = ?
            `).run(
                visibility,
                updatedAt,
                characterId
            );
        })();
    }
}

module.exports =
    new CharacterTypeCorrectionRepository();
