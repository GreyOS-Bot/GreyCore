const db = require("../../database/database");

class GuildAdvancedSettingRepository {
    getAll(guildId) {
        return db.prepare(`
            SELECT setting_key, setting_value, updated_at
            FROM GuildSettings
            WHERE guild_id = ?
            ORDER BY setting_key COLLATE NOCASE ASC
        `).all(guildId);
    }

    set(guildId, key, value) {
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO GuildSettings (
                guild_id, setting_key, setting_value, updated_at
            ) VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, setting_key) DO UPDATE SET
                setting_value = excluded.setting_value,
                updated_at = excluded.updated_at
        `).run(guildId, key, value, now);
        return this.getAll(guildId)
            .find(setting => setting.setting_key === key);
    }

    remove(guildId, key) {
        return db.prepare(`
            DELETE FROM GuildSettings
            WHERE guild_id = ? AND setting_key = ?
        `).run(guildId, key);
    }
}

module.exports = new GuildAdvancedSettingRepository();
