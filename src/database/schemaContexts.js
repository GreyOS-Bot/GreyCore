// Additive foundation only: existing domains remain guild-scoped.
module.exports = function initializeContexts(db = require('./database')) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS Contexts (
            id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL REFERENCES Guilds(id) ON DELETE RESTRICT,
            key TEXT NOT NULL CHECK(length(trim(key)) > 0),
            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
            description TEXT NOT NULL DEFAULT '',
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
            is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
            parent_context_id TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(guild_id, key),
            UNIQUE(guild_id, id),
            CHECK(is_default = 0 OR is_active = 1),
            CHECK(parent_context_id IS NULL OR parent_context_id <> id),
            FOREIGN KEY(guild_id, parent_context_id)
                REFERENCES Contexts(guild_id, id) ON DELETE RESTRICT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_contexts_default
            ON Contexts(guild_id) WHERE is_default = 1;
        CREATE INDEX IF NOT EXISTS idx_contexts_parent
            ON Contexts(guild_id, parent_context_id);
    `);
};
