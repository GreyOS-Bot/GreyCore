const db = require("../../database/database");

const SELECT = `SELECT e.*,a.character_id,a.continuity_id,a.status installation_a_status,
    a.proxy_enabled installation_a_proxy_enabled,ctx.is_active context_is_active,
    owner.discord_user_id owner_discord_user_id,
    b.character_id other_character_id,b.continuity_id other_continuity_id,
    other.proxy_name other_character_name,p.firstname other_firstname,p.lastname other_lastname
    FROM InstallationEncountersV2 e
    JOIN CharacterGuildInstallationsV2 a ON a.id=e.installation_a_id
    JOIN Contexts ctx ON ctx.id=e.context_id AND ctx.guild_id=e.guild_id
    JOIN CharactersV2 character ON character.id=a.character_id
    JOIN UsersV2 owner ON owner.id=character.owner_user_id
    LEFT JOIN CharacterGuildInstallationsV2 b ON b.id=e.installation_b_id
    LEFT JOIN CharactersV2 other ON other.id=b.character_id
    LEFT JOIN CharacterProfilesV2 p ON p.continuity_id=b.continuity_id`;

function getById(id) { return db.prepare(`${SELECT} WHERE e.id=?`).get(id); }
function getInstallation(id) { return db.prepare(`SELECT i.*,ctx.is_active context_is_active,c.is_archived,u.discord_user_id owner_discord_user_id
    FROM CharacterGuildInstallationsV2 i JOIN Contexts ctx ON ctx.id=i.context_id AND ctx.guild_id=i.guild_id
    JOIN CharactersV2 c ON c.id=i.character_id JOIN UsersV2 u ON u.id=c.owner_user_id WHERE i.id=?`).get(id); }
function getForInstallation(id,guild,context) { return db.prepare(`${SELECT} WHERE e.installation_a_id=? AND e.guild_id=? AND e.context_id=? ORDER BY e.occurred_at DESC,e.id DESC`).all(id,String(guild),context); }
function getEligibleTargets(guild,context,excludeId) { return db.prepare(`SELECT i.id installation_id,i.character_id,i.continuity_id,c.proxy_name,
    p.firstname,p.lastname,co.name continuity_name FROM CharacterGuildInstallationsV2 i
    JOIN CharactersV2 c ON c.id=i.character_id JOIN CharacterContinuitiesV2 co ON co.id=i.continuity_id
    LEFT JOIN CharacterProfilesV2 p ON p.continuity_id=i.continuity_id
    WHERE i.guild_id=? AND i.context_id=? AND i.id<>? AND i.status='approved' AND i.proxy_enabled=1 AND c.is_archived=0
    ORDER BY c.proxy_name COLLATE NOCASE,i.id`).all(String(guild),context,excludeId); }
function create(d) { const r=db.prepare(`INSERT INTO InstallationEncountersV2(guild_id,context_id,installation_a_id,installation_b_id,external_name,location,note,occurred_at,created_by,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(String(d.guildId),d.contextId,d.installationAId,d.installationBId,d.externalName,d.location,d.note,d.occurredAt,d.createdBy,d.createdAt,d.updatedAt); return getById(r.lastInsertRowid); }
function update(id,d) { db.prepare("UPDATE InstallationEncountersV2 SET external_name=?,location=?,note=?,occurred_at=?,updated_at=? WHERE id=?").run(d.externalName,d.location,d.note,d.occurredAt,d.updatedAt,id); return getById(id); }
function remove(id) { return db.prepare("DELETE FROM InstallationEncountersV2 WHERE id=?").run(id); }
function getLegacyUnmigratedExternal() { return db.prepare(`SELECT legacy.* FROM ContinuityEncountersV2 legacy
    LEFT JOIN InstallationEncountersV2 runtime ON runtime.legacy_encounter_id=legacy.id
    WHERE legacy.continuity_b_id IS NULL AND runtime.id IS NULL ORDER BY legacy.id`).all(); }

module.exports={getById,getInstallation,getForInstallation,getEligibleTargets,getLegacyUnmigratedExternal,create,update,delete:remove};
