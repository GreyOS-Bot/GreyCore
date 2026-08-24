function database() { return require("../../database/database"); }

class UserPlayBlockRepository {
    get(guildId, discordUserId) {
        return database().prepare(`
            SELECT * FROM GuildUserPlayBlocksV2
            WHERE guild_id = ? AND discord_user_id = ?
        `).get(String(guildId), String(discordUserId)) || null;
    }

    list(guildId) {
        return database().prepare(`
            SELECT * FROM GuildUserPlayBlocksV2
            WHERE guild_id = ?
            ORDER BY blocked_at DESC
        `).all(String(guildId));
    }

    save({ guildId, discordUserId, reason, blockedBy, now }) {
        database().prepare(`
            INSERT INTO GuildUserPlayBlocksV2 (
                guild_id, discord_user_id, reason, blocked_by, blocked_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, discord_user_id) DO UPDATE SET
                reason = excluded.reason,
                blocked_by = excluded.blocked_by,
                blocked_at = excluded.blocked_at,
                updated_at = excluded.updated_at
        `).run(String(guildId), String(discordUserId), reason, String(blockedBy), now, now);
        return this.get(guildId, discordUserId);
    }

    remove(guildId, discordUserId) {
        return database().prepare(`
            DELETE FROM GuildUserPlayBlocksV2
            WHERE guild_id = ? AND discord_user_id = ?
        `).run(String(guildId), String(discordUserId)).changes > 0;
    }
}

module.exports = new UserPlayBlockRepository();