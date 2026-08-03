const db =
    require(
        "../../database/database"
    );

const ROSTER_SELECT = `
    SELECT DISTINCT
        character.id,
        character.proxy_name,
        character.character_type,
        character.is_archived,
        user.discord_user_id,
        COALESCE(
            NULLIF(profile.alias, ''),
            NULLIF(profile.firstname, ''),
            NULLIF(continuity.firstname, ''),
            NULLIF(character.base_firstname, ''),
            character.proxy_name
        ) AS firstname

    FROM CharacterGuildInstallationsV2 AS installation

    JOIN CharactersV2 AS character
        ON character.id = installation.character_id

    JOIN UsersV2 AS user
        ON user.id = character.owner_user_id

    JOIN CharacterContinuitiesV2 AS continuity
        ON continuity.id = installation.continuity_id

    LEFT JOIN CharacterProfilesV2 AS profile
        ON profile.continuity_id = continuity.id
`;

class CharacterRosterRepository {

    getRoster(
        guildId,
        includeArchived = false
    ) {
        return db.prepare(`
            ${ROSTER_SELECT}

            WHERE installation.guild_id = ?
            AND installation.status = 'approved'
            AND (
                ? = 1
                OR character.is_archived = 0
            )

            ORDER BY
                firstname COLLATE NOCASE ASC,
                character.proxy_name COLLATE NOCASE ASC
        `).all(
            guildId,
            includeArchived
                ? 1
                : 0
        );
    }

    getByOwnerOnGuild(
        guildId,
        discordUserId
    ) {
        return db.prepare(`
            ${ROSTER_SELECT}

            WHERE installation.guild_id = ?
            AND user.discord_user_id = ?
            AND installation.status != 'archived'

            ORDER BY
                character.proxy_name COLLATE NOCASE ASC
        `).all(
            guildId,
            discordUserId
        );
    }

}

module.exports =
    new CharacterRosterRepository();
