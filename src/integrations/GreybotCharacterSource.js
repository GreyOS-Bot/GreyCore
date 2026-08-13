const installationManager =
    require(
        "../v2/managers/InstallationV2Manager"
    );

const database =
    require("../database/database");

function getPlayableCharactersForGuild(
    guildId
) {
    return installationManager
        .getPlayableCharactersForGuild(
            guildId
        );
}

function getDatabasePath() {
    return database.databasePath;
}

function getQbbCharactersForGuild(guildId) {
    return database.prepare(`
        SELECT DISTINCT
            character.id,
            installation.guild_id,
            user.discord_user_id AS owner_id,
            COALESCE(
                NULLIF(profile.alias, ''),
                NULLIF(profile.firstname, ''),
                NULLIF(continuity.firstname, ''),
                NULLIF(character.base_firstname, ''),
                character.proxy_name
            ) AS name,
            COALESCE(installation.local_avatar_url, character.avatar_url) AS avatar,
            character.character_type,
            CASE
                WHEN character.character_type = 'personnage_joue' THEN 1
                ELSE 0
            END AS can_respond,
            CASE
                WHEN character.character_type IN ('personnage_joue', 'pnj_reserve') THEN 1
                ELSE 0
            END AS can_be_cited
        FROM CharacterGuildInstallationsV2 installation
        JOIN CharactersV2 character
            ON character.id = installation.character_id
        JOIN UsersV2 user
            ON user.id = character.owner_user_id
        JOIN CharacterContinuitiesV2 continuity
            ON continuity.id = installation.continuity_id
        LEFT JOIN CharacterProfilesV2 profile
            ON profile.continuity_id = continuity.id
        WHERE installation.guild_id = ?
          AND installation.status = 'approved'
          AND installation.proxy_enabled = 1
          AND character.is_archived = 0
          AND character.character_type IN ('personnage_joue', 'pnj_reserve')
        ORDER BY name COLLATE NOCASE ASC, character.id ASC
    `).all(String(guildId));
}

module.exports = {
    getPlayableCharactersForGuild,
    getQbbCharactersForGuild,
    getDatabasePath
};
