const db = require("./database");

function initializeEntitySchemaV2() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntitiesV2 (
            id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar_url TEXT,
            embed_color INTEGER NOT NULL DEFAULT 5793266,
            description TEXT,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE,
            UNIQUE(guild_id, name)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityTriggersV2 (
            entity_id TEXT NOT NULL,
            trigger_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(entity_id, trigger_key),
            FOREIGN KEY(entity_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityMessagesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id TEXT NOT NULL,
            trigger_key TEXT,
            content TEXT NOT NULL,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(entity_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityScopesV2 (
            entity_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(entity_id, channel_id),
            FOREIGN KEY(entity_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityExpressionsV2 (
            entity_id TEXT NOT NULL,
            expression TEXT NOT NULL,
            normalized_expression TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(entity_id, normalized_expression),
            FOREIGN KEY(entity_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityChannelWelcomesV2 (
            entity_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            welcomed_at TEXT NOT NULL,
            PRIMARY KEY(entity_id, channel_id),
            FOREIGN KEY(entity_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_narrative_entities_guild
        ON NarrativeEntitiesV2(guild_id, is_enabled)
    `).run();
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_narrative_triggers_key
        ON NarrativeEntityTriggersV2(trigger_key, entity_id)
    `).run();
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_narrative_scopes_channel
        ON NarrativeEntityScopesV2(channel_id, entity_id)
    `).run();
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_narrative_expressions_entity
        ON NarrativeEntityExpressionsV2(entity_id)
    `).run();
}

module.exports = initializeEntitySchemaV2;
