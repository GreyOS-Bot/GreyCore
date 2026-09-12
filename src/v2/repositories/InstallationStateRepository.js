const db = require("../../database/database");

const SELECT = `SELECT s.*, s.id AS state_id, t.name,t.emoji,t.color
    FROM InstallationStatesV2 s JOIN StateTypes t ON t.id=s.state_type_id`;

class InstallationStateRepository {
    supportsRuntime() { return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='InstallationStatesV2'").get()); }
    getById(id) { return db.prepare(`${SELECT} WHERE s.id=?`).get(id); }
    getActive(installationId) { return db.prepare(`${SELECT} WHERE s.installation_id=? AND s.ended_at IS NULL ORDER BY s.started_at DESC,s.id DESC`).all(installationId); }
    getHistory(installationId) { return db.prepare(`${SELECT} WHERE s.installation_id=? ORDER BY s.started_at DESC,s.id DESC`).all(installationId); }
    findActive(installationId, stateTypeId) { return db.prepare("SELECT id FROM InstallationStatesV2 WHERE installation_id=? AND state_type_id=? AND ended_at IS NULL").get(installationId,stateTypeId); }
    getScope(installationId) {
        return db.prepare(`SELECT i.*,c.is_active,u.discord_user_id AS owner_id,ch.is_archived AS character_archived
            FROM CharacterGuildInstallationsV2 i
            JOIN Contexts c ON c.id=i.context_id AND c.guild_id=i.guild_id
            JOIN CharactersV2 ch ON ch.id=i.character_id
            JOIN UsersV2 u ON u.id=ch.owner_user_id WHERE i.id=?`).get(installationId);
    }
    getStateType(id,guildId) { return db.prepare("SELECT id FROM StateTypes WHERE id=? AND guild_id=?").get(id,String(guildId)); }
    insert(data) {
        const result=db.prepare(`INSERT INTO InstallationStatesV2
            (guild_id,context_id,installation_id,state_type_id,note,started_at,ended_at,created_by,created_at,updated_at)
            VALUES(@guildId,@contextId,@installationId,@stateTypeId,@note,@startedAt,NULL,@createdBy,@createdAt,@updatedAt)`).run(data);
        return this.getById(result.lastInsertRowid);
    }
    end(id,at) { db.prepare("UPDATE InstallationStatesV2 SET ended_at=?,updated_at=? WHERE id=?").run(at,at,id); return this.getById(id); }
    update(id,data) { db.prepare("UPDATE InstallationStatesV2 SET note=?,started_at=?,updated_at=? WHERE id=?").run(data.note,data.startedAt,data.updatedAt,id); return this.getById(id); }
    delete(id) { return db.prepare("DELETE FROM InstallationStatesV2 WHERE id=?").run(id); }
    getLegacyUnmigrated() { return db.prepare(`SELECT l.* FROM ContinuityStatesV2 l LEFT JOIN InstallationStatesV2 r ON r.legacy_state_id=l.id WHERE r.id IS NULL ORDER BY l.id`).all(); }
}
module.exports=new InstallationStateRepository();
