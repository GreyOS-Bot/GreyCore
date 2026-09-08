const db=require("../../database/database");

const SELECT=`SELECT r.*,a.character_id character_a_id,a.continuity_id continuity_a_id,
 b.character_id character_b_id,b.continuity_id continuity_b_id,
 t.key,t.label_a_to_b,t.label_b_to_a,t.is_symmetric,
 COALESCE(NULLIF(pa.alias,''),NULLIF(TRIM(COALESCE(pa.firstname,ca.firstname,'')||' '||COALESCE(pa.lastname,ca.lastname,'')),''),cha.proxy_name) character_a_name,
 COALESCE(NULLIF(pb.alias,''),NULLIF(TRIM(COALESCE(pb.firstname,cb.firstname,'')||' '||COALESCE(pb.lastname,cb.lastname,'')),''),chb.proxy_name) character_b_name
 FROM InstallationRelationshipsV2 r
 JOIN CharacterGuildInstallationsV2 a ON a.id=r.installation_a_id
 JOIN CharacterGuildInstallationsV2 b ON b.id=r.installation_b_id
 JOIN CharacterContinuitiesV2 ca ON ca.id=a.continuity_id
 JOIN CharacterContinuitiesV2 cb ON cb.id=b.continuity_id
 JOIN CharactersV2 cha ON cha.id=a.character_id JOIN CharactersV2 chb ON chb.id=b.character_id
 JOIN RelationshipTypes t ON t.id=r.relationship_type_id
 LEFT JOIN CharacterProfilesV2 pa ON pa.continuity_id=ca.id
 LEFT JOIN CharacterProfilesV2 pb ON pb.continuity_id=cb.id`;

const REQUEST_SELECT=`SELECT r.*,a.character_id requester_character_id,a.continuity_id requester_continuity_id,
 b.character_id target_character_id,b.continuity_id target_continuity_id,
 t.label_a_to_b,t.label_b_to_a,t.is_symmetric,
 COALESCE(NULLIF(pa.alias,''),NULLIF(pa.firstname,''),NULLIF(ca.firstname,''),cha.proxy_name) requester_character_name,
 COALESCE(NULLIF(pb.alias,''),NULLIF(pb.firstname,''),NULLIF(cb.firstname,''),chb.proxy_name) target_character_name,
 ua.discord_user_id requester_owner_id,ub.discord_user_id current_target_owner_id
 FROM PendingInstallationRelationshipsV2 r
 JOIN CharacterGuildInstallationsV2 a ON a.id=r.requester_installation_id
 JOIN CharacterGuildInstallationsV2 b ON b.id=r.target_installation_id
 JOIN CharacterContinuitiesV2 ca ON ca.id=a.continuity_id JOIN CharacterContinuitiesV2 cb ON cb.id=b.continuity_id
 JOIN CharactersV2 cha ON cha.id=a.character_id JOIN CharactersV2 chb ON chb.id=b.character_id
 JOIN UsersV2 ua ON ua.id=cha.owner_user_id JOIN UsersV2 ub ON ub.id=chb.owner_user_id
 JOIN RelationshipTypes t ON t.id=r.relationship_type_id
 LEFT JOIN CharacterProfilesV2 pa ON pa.continuity_id=ca.id LEFT JOIN CharacterProfilesV2 pb ON pb.continuity_id=cb.id`;

function getInstallation(id){return db.prepare(`SELECT i.*,c.is_active context_is_active,
 ch.owner_user_id,u.discord_user_id owner_discord_user_id FROM CharacterGuildInstallationsV2 i
 JOIN Contexts c ON c.id=i.context_id AND c.guild_id=i.guild_id JOIN CharactersV2 ch ON ch.id=i.character_id
 JOIN UsersV2 u ON u.id=ch.owner_user_id WHERE i.id=?`).get(id);}
function getCandidates(guildId,continuityId,contextId=null){return db.prepare(`SELECT i.*,c.is_active context_is_active,
 ch.owner_user_id,u.discord_user_id owner_discord_user_id FROM CharacterGuildInstallationsV2 i
 JOIN Contexts c ON c.id=i.context_id AND c.guild_id=i.guild_id JOIN CharactersV2 ch ON ch.id=i.character_id
 JOIN UsersV2 u ON u.id=ch.owner_user_id WHERE i.guild_id=? AND i.continuity_id=?
 AND (? IS NULL OR i.context_id=?) ORDER BY i.id`).all(String(guildId),continuityId,contextId,contextId);}
function getById(id){return db.prepare(`${SELECT} WHERE r.id=?`).get(id);}
function getForInstallation(id,contextId){return db.prepare(`${SELECT} WHERE r.context_id=? AND r.ended_at IS NULL
 AND (r.installation_a_id=? OR r.installation_b_id=?) ORDER BY r.started_at DESC,r.created_at DESC,r.id DESC`).all(contextId,id,id);}
function getForContext(guildId,contextId){return db.prepare(`${SELECT} WHERE r.guild_id=? AND r.context_id=? AND r.ended_at IS NULL ORDER BY r.id`).all(String(guildId),contextId);}
function findActive(a,b,type,contextId){return db.prepare(`SELECT id FROM InstallationRelationshipsV2 WHERE context_id=?
 AND relationship_type_id=? AND pair_low_installation_id=? AND pair_high_installation_id=? AND ended_at IS NULL`).get(contextId,type,Math.min(a,b),Math.max(a,b));}
function insert(d){const x=db.prepare(`INSERT INTO InstallationRelationshipsV2(guild_id,context_id,installation_a_id,
 installation_b_id,pair_low_installation_id,pair_high_installation_id,relationship_type_id,note,started_at,ended_at,
 created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,NULL,?,?,?)`).run(String(d.guildId),d.contextId,d.installationAId,
 d.installationBId,Math.min(d.installationAId,d.installationBId),Math.max(d.installationAId,d.installationBId),d.relationshipTypeId,
 d.note,d.startedAt,d.createdBy,d.createdAt,d.updatedAt);return getById(x.lastInsertRowid);}
function update(id,d){db.prepare("UPDATE InstallationRelationshipsV2 SET note=?,started_at=?,updated_at=? WHERE id=?")
 .run(d.note,d.startedAt,d.updatedAt,id);return getById(id);}
function end(id,at){db.prepare("UPDATE InstallationRelationshipsV2 SET ended_at=?,updated_at=? WHERE id=?").run(at,at,id);return getById(id);}
function remove(id){return db.prepare("DELETE FROM InstallationRelationshipsV2 WHERE id=?").run(id);}
function getRequestById(id){return db.prepare(`${REQUEST_SELECT} WHERE r.id=?`).get(id);}
function findPending(a,b,type,contextId){return db.prepare(`SELECT id FROM PendingInstallationRelationshipsV2 WHERE context_id=?
 AND relationship_type_id=? AND pair_low_installation_id=? AND pair_high_installation_id=? AND status='pending'`)
 .get(contextId,type,Math.min(a,b),Math.max(a,b));}
function insertRequest(d){const x=db.prepare(`INSERT INTO PendingInstallationRelationshipsV2(guild_id,context_id,
 requester_installation_id,target_installation_id,pair_low_installation_id,pair_high_installation_id,relationship_type_id,
 requested_by,target_owner_id,note,started_at,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?)`)
 .run(String(d.guildId),d.contextId,d.requesterInstallationId,d.targetInstallationId,Math.min(d.requesterInstallationId,d.targetInstallationId),
 Math.max(d.requesterInstallationId,d.targetInstallationId),d.relationshipTypeId,d.requestedBy,d.targetOwnerId,d.note,d.startedAt,d.createdAt);
 return getRequestById(x.lastInsertRowid);}
function respondRequest(id,status,by,at){db.prepare(`UPDATE PendingInstallationRelationshipsV2 SET status=?,responded_at=?,responded_by=?
 WHERE id=? AND status='pending'`).run(status,at,by,id);return getRequestById(id);}
function deletePending(id){return db.prepare("DELETE FROM PendingInstallationRelationshipsV2 WHERE id=? AND status='pending'").run(id);}
function getLegacyRelationships(guildId){return db.prepare("SELECT * FROM ContinuityRelationshipsV2 WHERE guild_id=? ORDER BY id").all(String(guildId));}
function getLegacyRequests(guildId){return db.prepare(`SELECT p.* FROM PendingContinuityRelationshipsV2 p JOIN RelationshipTypes t
 ON t.id=p.relationship_type_id WHERE t.guild_id=? ORDER BY p.id`).all(String(guildId));}
module.exports={getInstallation,getCandidates,getById,getForInstallation,getForContext,findActive,insert,update,end,delete:remove,
 getRequestById,findPending,insertRequest,respondRequest,deletePending,getLegacyRelationships,getLegacyRequests,
 runInTransaction:fn=>db.transaction(fn)()};
