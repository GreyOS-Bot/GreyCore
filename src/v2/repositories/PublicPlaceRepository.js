const db = require("../../database/database");

class PublicPlaceRepository {
    supportsRuntime() { return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ContextPublicPlacesV2'").get()); }
    context(guildId, contextId) { return db.prepare("SELECT * FROM Contexts WHERE guild_id=? AND id=?").get(guildId,contextId); }
    upsertMany(guildId, contextId, forumId, places) {
        if(places===undefined){places=forumId;forumId=contextId;return this.upsertLegacy(guildId,forumId,places);}
        if (!this.supportsRuntime()) return this.upsertLegacy(guildId,forumId,places);
        const statement = db.prepare(`
            INSERT INTO ContextPublicPlacesV2
                (guild_id, context_id, forum_id, channel_id, name, is_archived, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(context_id, channel_id) DO UPDATE SET
                forum_id = excluded.forum_id,
                name = excluded.name,
                is_archived = excluded.is_archived,
                updated_at = excluded.updated_at
        `);
        const now = new Date().toISOString();
        db.transaction(() => {
            for (const place of places) statement.run(
                guildId, contextId, forumId, place.id, place.name,
                place.archived ? 1 : 0, now
            );
        })();
        return this.getByForum(guildId, contextId, forumId);
    }

    getByForum(guildId, contextId, forumId) {
        if(forumId===undefined)return this.getLegacyByForum(guildId,contextId);
        if (!this.supportsRuntime()) return this.getLegacyByForum(guildId,contextId);
        return db.prepare(`
            SELECT * FROM ContextPublicPlacesV2
            WHERE guild_id = ? AND context_id = ? AND forum_id = ?
            ORDER BY category IS NULL DESC, category ASC, name COLLATE NOCASE ASC
        `).all(guildId, contextId, forumId);
    }

    getPublishedForContext(guildId, contextId) {
        if (!this.supportsRuntime()) return db.prepare(`SELECT * FROM GuildPublicPlacesV2 WHERE guild_id=? AND category IS NOT NULL ORDER BY category,name COLLATE NOCASE`).all(guildId);
        return db.prepare(`
            SELECT * FROM ContextPublicPlacesV2
            WHERE guild_id = ? AND context_id = ? AND category IS NOT NULL
            ORDER BY category ASC, name COLLATE NOCASE ASC
        `).all(guildId,contextId);
    }
    getPublishedForGuild(guildId){return db.prepare(`SELECT * FROM GuildPublicPlacesV2 WHERE guild_id=? AND category IS NOT NULL ORDER BY category,name COLLATE NOCASE`).all(guildId);}

    setCategory(guildId, contextId, channelId, category) {
        if(category===undefined){category=channelId;channelId=contextId;return db.prepare(`UPDATE GuildPublicPlacesV2 SET category=?,updated_at=? WHERE guild_id=? AND channel_id=?`).run(category,new Date().toISOString(),guildId,channelId);}
        if (!this.supportsRuntime()) return db.prepare(`UPDATE GuildPublicPlacesV2 SET category=?,updated_at=? WHERE guild_id=? AND channel_id=?`).run(category,new Date().toISOString(),guildId,contextId);
        return db.prepare(`
            UPDATE ContextPublicPlacesV2 SET category = ?, updated_at = ?
            WHERE guild_id = ? AND context_id = ? AND channel_id = ?
        `).run(category, new Date().toISOString(), guildId, contextId, channelId);
    }
    upsertLegacy(guildId,forumId,places){const q=db.prepare(`INSERT INTO GuildPublicPlacesV2(guild_id,forum_id,channel_id,name,is_archived,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(guild_id,channel_id) DO UPDATE SET forum_id=excluded.forum_id,name=excluded.name,is_archived=excluded.is_archived,updated_at=excluded.updated_at`),now=new Date().toISOString();db.transaction(()=>places.forEach(p=>q.run(guildId,forumId,p.id,p.name,p.archived?1:0,now)))();return this.getLegacyByForum(guildId,forumId);}
    getLegacyByForum(guildId,forumId){return db.prepare(`SELECT * FROM GuildPublicPlacesV2 WHERE guild_id=? AND forum_id=? ORDER BY category IS NULL DESC,category,name COLLATE NOCASE`).all(guildId,forumId);}
}

module.exports = new PublicPlaceRepository();
