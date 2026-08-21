const db = require("../../database/database");

class PublicPlaceRepository {
    upsertMany(guildId, forumId, places) {
        const statement = db.prepare(`
            INSERT INTO GuildPublicPlacesV2
                (guild_id, forum_id, channel_id, name, is_archived, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, channel_id) DO UPDATE SET
                forum_id = excluded.forum_id,
                name = excluded.name,
                is_archived = excluded.is_archived,
                updated_at = excluded.updated_at
        `);
        const now = new Date().toISOString();
        db.transaction(() => {
            for (const place of places) statement.run(
                guildId, forumId, place.id, place.name,
                place.archived ? 1 : 0, now
            );
        })();
        return this.getByForum(guildId, forumId);
    }

    getByForum(guildId, forumId) {
        return db.prepare(`
            SELECT * FROM GuildPublicPlacesV2
            WHERE guild_id = ? AND forum_id = ?
            ORDER BY category IS NULL DESC, category ASC, name COLLATE NOCASE ASC
        `).all(guildId, forumId);
    }

    setCategory(guildId, channelId, category) {
        return db.prepare(`
            UPDATE GuildPublicPlacesV2 SET category = ?, updated_at = ?
            WHERE guild_id = ? AND channel_id = ?
        `).run(category, new Date().toISOString(), guildId, channelId);
    }
}

module.exports = new PublicPlaceRepository();
