const db = require("../database/database");

class ServerConfigManager {
    get(guildId, key, defaultValue = null) {
        const row = db.prepare(`
            SELECT setting_value
            FROM GuildSettings
            WHERE guild_id = ?
            AND setting_key = ?
        `).get(guildId, key);

        return row ? row.setting_value : defaultValue;
    }

    set(guildId, key, value) {
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO GuildSettings (
                guild_id,
                setting_key,
                setting_value,
                updated_at
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(guild_id, setting_key)
            DO UPDATE SET
                setting_value = excluded.setting_value,
                updated_at = excluded.updated_at
        `).run(
            guildId,
            key,
            value !== null && value !== undefined
                ? String(value)
                : null,
            now
        );

        return this.get(guildId, key);
    }

    remove(guildId, key) {
        return db.prepare(`
            DELETE FROM GuildSettings
            WHERE guild_id = ?
            AND setting_key = ?
        `).run(guildId, key);
    }

    getAll(guildId) {
        return db.prepare(`
            SELECT
                setting_key,
                setting_value,
                updated_at
            FROM GuildSettings
            WHERE guild_id = ?
            ORDER BY setting_key ASC
        `).all(guildId);
    }
}

module.exports = new ServerConfigManager();