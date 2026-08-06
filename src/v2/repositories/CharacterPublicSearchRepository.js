const db = require(
    "../../database/database"
);

class CharacterPublicSearchRepository {
    searchInstalledByDisplayName(
        guildId,
        focused
    ) {
        return db.prepare(`
            SELECT DISTINCT
                character.id,
                character.proxy_name,
                COALESCE(
                    NULLIF(TRIM(profile.alias), ''),
                    character.proxy_name
                ) AS display_name,
                user.discord_user_id
            FROM CharactersV2 character
            JOIN UsersV2 user
                ON user.id = character.owner_user_id
            JOIN CharacterGuildInstallationsV2 installation
                ON installation.character_id = character.id
            LEFT JOIN CharacterProfilesV2 profile
                ON profile.continuity_id =
                    installation.continuity_id
            WHERE installation.guild_id = ?
            AND character.is_archived = 0
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1
            AND LOWER(
                COALESCE(
                    NULLIF(TRIM(profile.alias), ''),
                    character.proxy_name
                )
            ) LIKE LOWER(?)
            ORDER BY display_name COLLATE NOCASE
            LIMIT 25
        `).all(
            guildId,
            `%${focused}%`
        );
    }
}

module.exports =
    new CharacterPublicSearchRepository();
