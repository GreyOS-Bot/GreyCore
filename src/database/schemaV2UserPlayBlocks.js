const db = require("./database");

function initializeUserPlayBlockSchemaV2() {
    const db = require("./database");
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildUserPlayBlocksV2 (
            guild_id TEXT NOT NULL,
            discord_user_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            blocked_by TEXT NOT NULL,
            blocked_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (guild_id, discord_user_id)
        )
    `).run();
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_user_play_blocks_guild
        ON GuildUserPlayBlocksV2(guild_id)
    `).run();
}

module.exports = initializeUserPlayBlockSchemaV2;
