const db = require("../../database/database");

function getInstallations(guildId, discordUserId) {
    return db.prepare(`
        SELECT installation.id, installation.status, installation.rejection_reason,
            installation.suspension_reason,
            COALESCE(NULLIF(profile.alias, ''), NULLIF(profile.firstname, ''),
                NULLIF(continuity.firstname, ''), character.proxy_name) AS character_name
        FROM CharacterGuildInstallationsV2 installation
        JOIN CharactersV2 character ON character.id = installation.character_id
        JOIN UsersV2 owner ON owner.id = character.owner_user_id
        JOIN CharacterContinuitiesV2 continuity ON continuity.id = installation.continuity_id
        LEFT JOIN CharacterProfilesV2 profile ON profile.continuity_id = continuity.id
        WHERE installation.guild_id = ?
        AND owner.discord_user_id = ?
        AND installation.status != 'archived'
        ORDER BY installation.updated_at DESC, installation.id DESC
    `).all(guildId, discordUserId);
}

function getPendingRelationships(guildId, discordUserId) {
    return db.prepare(`
        SELECT pending.id, type.label_a_to_b, type.label_b_to_a,
            COALESCE(NULLIF(sourceProfile.alias, ''), NULLIF(sourceProfile.firstname, ''),
                NULLIF(sourceContinuity.firstname, ''), sourceCharacter.proxy_name) AS source_name,
            COALESCE(NULLIF(targetProfile.alias, ''), NULLIF(targetProfile.firstname, ''),
                NULLIF(targetContinuity.firstname, ''), targetCharacter.proxy_name) AS target_name
        FROM PendingContinuityRelationshipsV2 pending
        JOIN RelationshipTypes type ON type.id = pending.relationship_type_id
        JOIN CharacterContinuitiesV2 sourceContinuity
            ON sourceContinuity.id = pending.requester_continuity_id
        JOIN CharacterContinuitiesV2 targetContinuity
            ON targetContinuity.id = pending.target_continuity_id
        JOIN CharactersV2 sourceCharacter ON sourceCharacter.id = sourceContinuity.character_id
        JOIN CharactersV2 targetCharacter ON targetCharacter.id = targetContinuity.character_id
        LEFT JOIN CharacterProfilesV2 sourceProfile ON sourceProfile.continuity_id = sourceContinuity.id
        LEFT JOIN CharacterProfilesV2 targetProfile ON targetProfile.continuity_id = targetContinuity.id
        WHERE type.guild_id = ?
        AND pending.target_owner_id = ?
        AND pending.status = 'pending'
        ORDER BY pending.created_at DESC, pending.id DESC
    `).all(guildId, discordUserId);
}

function getPendingCorrections(guildId, discordUserId) {
    return db.prepare(`
        SELECT installation.id, installation.suspension_reason AS reason,
            COALESCE(NULLIF(profile.alias, ''), NULLIF(profile.firstname, ''),
                NULLIF(continuity.firstname, ''), character.proxy_name) AS character_name
        FROM CharacterGuildInstallationsV2 installation
        JOIN CharactersV2 character ON character.id = installation.character_id
        JOIN UsersV2 owner ON owner.id = character.owner_user_id
        JOIN CharacterContinuitiesV2 continuity ON continuity.id = installation.continuity_id
        LEFT JOIN CharacterProfilesV2 profile ON profile.continuity_id = continuity.id
        WHERE installation.guild_id = ?
        AND owner.discord_user_id = ?
        AND installation.status = 'suspended'
        ORDER BY installation.updated_at DESC, installation.id DESC
    `).all(guildId, discordUserId);
}

module.exports = {
    getInstallations,
    getPendingRelationships,
    getPendingCorrections
};
