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
        CREATE TABLE IF NOT EXISTS NarrativeEntityEventsV2 (
            id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            calendar_rule TEXT NOT NULL DEFAULT 'always',
            weekday_rule TEXT NOT NULL DEFAULT '*',
            time_rule TEXT NOT NULL,
            timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
            message_content TEXT,
            action_key TEXT NOT NULL DEFAULT 'none',
            action_payload TEXT,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            last_run_key TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE,
            FOREIGN KEY(entity_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityEventScopesV2 (
            event_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(event_id, channel_id),
            FOREIGN KEY(event_id) REFERENCES NarrativeEntityEventsV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityEventRunsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            run_key TEXT NOT NULL,
            channel_id TEXT,
            message_id TEXT,
            status TEXT NOT NULL,
            error_message TEXT,
            attempt_token TEXT,
            external_effect_attempted INTEGER,
            lease_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(event_id) REFERENCES NarrativeEntityEventsV2(id) ON DELETE CASCADE,
            UNIQUE(event_id, run_key, channel_id)
        )
    `).run();

    const runColumns = new Set(
        db.prepare("PRAGMA table_info(NarrativeEntityEventRunsV2)")
            .all()
            .map(column => column.name)
    );
    for (const [name, definition] of [
        ["attempt_token", "TEXT"],
        ["external_effect_attempted", "INTEGER"],
        ["lease_at", "TEXT"]
    ]) {
        if (!runColumns.has(name)) {
            db.prepare(`ALTER TABLE NarrativeEntityEventRunsV2 ADD COLUMN ${name} ${definition}`).run();
        }
    }

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
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_narrative_events_due
        ON NarrativeEntityEventsV2(is_enabled, guild_id, entity_id)
    `).run();
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_narrative_event_scopes
        ON NarrativeEntityEventScopesV2(event_id, channel_id)
    `).run();
}

module.exports = initializeEntitySchemaV2;
