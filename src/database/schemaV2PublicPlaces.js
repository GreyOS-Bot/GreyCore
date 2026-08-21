const db = require("./database");

module.exports = function initializePublicPlacesSchemaV2() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS GuildPublicPlacesV2 (
            guild_id TEXT NOT NULL,
            forum_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            is_archived INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (guild_id, channel_id)
        );
        CREATE INDEX IF NOT EXISTS idx_public_places_forum
        ON GuildPublicPlacesV2 (guild_id, forum_id, category, name);
    `);
};
