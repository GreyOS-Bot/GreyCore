module.exports = function initializeContextPublicPlaceSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS ContextPublicPlacesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, context_id TEXT NOT NULL,
            forum_id TEXT NOT NULL, channel_id TEXT NOT NULL, name TEXT NOT NULL, category TEXT,
            is_archived INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, legacy_guild_id TEXT, legacy_channel_id TEXT,
            FOREIGN KEY(guild_id,context_id) REFERENCES Contexts(guild_id,id) ON DELETE RESTRICT,
            UNIQUE(context_id,channel_id), UNIQUE(legacy_guild_id,legacy_channel_id)
        );
        CREATE INDEX IF NOT EXISTS idx_context_public_places_forum ON ContextPublicPlacesV2(guild_id,context_id,forum_id,category,name);
        CREATE TRIGGER IF NOT EXISTS trg_context_public_place_immutable BEFORE UPDATE OF guild_id,context_id,legacy_guild_id,legacy_channel_id ON ContextPublicPlacesV2
        BEGIN SELECT RAISE(ABORT,'Public Place scope is immutable'); END;
    `);
    const hasLegacy=Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='GuildPublicPlacesV2'").get());
    if (!hasLegacy) return;
    db.prepare(`INSERT OR IGNORE INTO ContextPublicPlacesV2(guild_id,context_id,forum_id,channel_id,name,category,is_archived,updated_at,legacy_guild_id,legacy_channel_id)
        SELECT p.guild_id,MIN(c.id),p.forum_id,p.channel_id,p.name,p.category,p.is_archived,p.updated_at,p.guild_id,p.channel_id
        FROM GuildPublicPlacesV2 p JOIN Contexts c ON c.guild_id=p.guild_id
        GROUP BY p.guild_id,p.channel_id HAVING COUNT(c.id)=1`).run();
};
