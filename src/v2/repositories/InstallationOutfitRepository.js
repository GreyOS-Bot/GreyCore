const db = require("../../database/database");

class InstallationOutfitRepository {
    supportsRuntime() { return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='InstallationOutfitsV2'").get()); }
    getById(id) { return db.prepare("SELECT * FROM InstallationOutfitsV2 WHERE id=?").get(id); }
    getCurrent(installationId) { return db.prepare("SELECT * FROM InstallationOutfitsV2 WHERE installation_id=? AND is_current=1 LIMIT 1").get(installationId); }
    getForInstallation(installationId,limit) { return db.prepare("SELECT * FROM InstallationOutfitsV2 WHERE installation_id=? ORDER BY is_current DESC,updated_at DESC,id DESC LIMIT ?").all(installationId,limit); }
    getHistory(installationId,limit) { return db.prepare("SELECT * FROM InstallationOutfitsV2 WHERE installation_id=? ORDER BY created_at DESC,id DESC LIMIT ?").all(installationId,limit); }
    getScope(installationId) {
        return db.prepare(`SELECT i.*,c.is_active,u.discord_user_id AS owner_id,ch.is_archived AS character_archived
            FROM CharacterGuildInstallationsV2 i
            JOIN Contexts c ON c.id=i.context_id AND c.guild_id=i.guild_id
            JOIN CharactersV2 ch ON ch.id=i.character_id
            JOIN UsersV2 u ON u.id=ch.owner_user_id WHERE i.id=?`).get(installationId);
    }
    createCurrent(data) {
        const tx=db.transaction(row=>{ db.prepare("UPDATE InstallationOutfitsV2 SET is_current=0,updated_at=? WHERE installation_id=? AND is_current=1").run(row.updatedAt,row.installationId);
            const result=db.prepare(`INSERT INTO InstallationOutfitsV2
                (guild_id,context_id,installation_id,image_url,image_data,image_filename,image_content_type,title,description,is_current,created_at,updated_at)
                VALUES(@guildId,@contextId,@installationId,@imageUrl,@imageData,@imageFilename,@imageContentType,@title,@description,1,@createdAt,@updatedAt)`).run(row); return result.lastInsertRowid; });
        return this.getById(tx.immediate(data));
    }
    updateDetails(id,data) { db.prepare("UPDATE InstallationOutfitsV2 SET title=?,description=?,updated_at=? WHERE id=?").run(data.title,data.description,data.updatedAt,id); return this.getById(id); }
    setCurrent(outfit,at) { const tx=db.transaction(()=>{ db.prepare("UPDATE InstallationOutfitsV2 SET is_current=0,updated_at=? WHERE installation_id=? AND is_current=1").run(at,outfit.installation_id); db.prepare("UPDATE InstallationOutfitsV2 SET is_current=1,updated_at=? WHERE id=?").run(at,outfit.id); }); tx.immediate(); return this.getById(outfit.id); }
    delete(id) { return db.prepare("DELETE FROM InstallationOutfitsV2 WHERE id=?").run(id); }
    getLegacyUnmigrated() { return db.prepare(`SELECT l.* FROM ContinuityOutfitsV2 l LEFT JOIN InstallationOutfitsV2 r ON r.legacy_outfit_id=l.id WHERE r.id IS NULL ORDER BY l.id`).all(); }
}
module.exports=new InstallationOutfitRepository();
