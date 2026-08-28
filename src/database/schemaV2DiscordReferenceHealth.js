const db = require("./database");

function initializeDiscordReferenceHealthSchema() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS DiscordReferenceHealth (
            domain TEXT NOT NULL,
            owner_key TEXT NOT NULL,
            resource_kind TEXT NOT NULL,
            discord_id TEXT NOT NULL,
            guild_id TEXT,
            status TEXT NOT NULL,
            discord_code INTEGER,
            first_failed_at TEXT,
            last_checked_at TEXT NOT NULL,
            last_failed_at TEXT,
            failure_count INTEGER NOT NULL DEFAULT 0,
            next_check_at TEXT,
            resolved_at TEXT,
            diagnostic TEXT,
            PRIMARY KEY (
                domain,
                owner_key,
                resource_kind,
                discord_id
            )
        )
    `).run();
}

module.exports = initializeDiscordReferenceHealthSchema;
