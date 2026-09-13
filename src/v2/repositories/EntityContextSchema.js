function exists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

module.exports = function initializeEntityContextSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS NarrativeEntityInstancesV2 (
            id TEXT PRIMARY KEY,
            entity_definition_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            legacy_entity_id TEXT UNIQUE,
            FOREIGN KEY(entity_definition_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(guild_id,context_id) REFERENCES Contexts(guild_id,id) ON DELETE RESTRICT,
            UNIQUE(entity_definition_id,context_id)
        );
        CREATE INDEX IF NOT EXISTS idx_entity_instances_context ON NarrativeEntityInstancesV2(guild_id,context_id,is_active);
        CREATE TABLE IF NOT EXISTS GreyFateEntityConfigurationV2 (
            guild_id TEXT PRIMARY KEY, entity_definition_id TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE,
            FOREIGN KEY(entity_definition_id) REFERENCES NarrativeEntitiesV2(id) ON DELETE RESTRICT
        );
        CREATE TRIGGER IF NOT EXISTS trg_entity_instance_scope_insert BEFORE INSERT ON NarrativeEntityInstancesV2
        WHEN NOT EXISTS (SELECT 1 FROM NarrativeEntitiesV2 d WHERE d.id=NEW.entity_definition_id AND d.guild_id=NEW.guild_id)
        BEGIN SELECT RAISE(ABORT,'Entity instance scope mismatch'); END;
        CREATE TRIGGER IF NOT EXISTS trg_entity_instance_scope_immutable BEFORE UPDATE OF entity_definition_id,guild_id,context_id,legacy_entity_id ON NarrativeEntityInstancesV2
        BEGIN SELECT RAISE(ABORT,'Entity instance scope is immutable'); END;

        CREATE TABLE IF NOT EXISTS NarrativeEntityInstanceScopesV2 (
            instance_id TEXT NOT NULL, guild_id TEXT NOT NULL, context_id TEXT NOT NULL,
            channel_id TEXT NOT NULL, created_at TEXT NOT NULL,
            PRIMARY KEY(instance_id,channel_id),
            FOREIGN KEY(instance_id) REFERENCES NarrativeEntityInstancesV2(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_entity_instance_scopes_context ON NarrativeEntityInstanceScopesV2(guild_id,context_id,channel_id);
        CREATE TRIGGER IF NOT EXISTS trg_entity_scope_validate BEFORE INSERT ON NarrativeEntityInstanceScopesV2
        WHEN NOT EXISTS (SELECT 1 FROM NarrativeEntityInstancesV2 i WHERE i.id=NEW.instance_id AND i.guild_id=NEW.guild_id AND i.context_id=NEW.context_id)
          OR NOT EXISTS (SELECT 1 FROM SceneChannelsV2 sc JOIN ScenesV2 s ON s.id=sc.scene_id WHERE sc.guild_id=NEW.guild_id AND sc.channel_id=NEW.channel_id AND sc.unlinked_at IS NULL AND s.context_id=NEW.context_id)
        BEGIN SELECT RAISE(ABORT,'Entity scope Context mismatch'); END;

        CREATE TABLE IF NOT EXISTS NarrativeEntityInstanceWelcomesV2 (
            instance_id TEXT NOT NULL, guild_id TEXT NOT NULL, context_id TEXT NOT NULL,
            channel_id TEXT NOT NULL, welcomed_at TEXT NOT NULL,
            PRIMARY KEY(instance_id,channel_id),
            FOREIGN KEY(instance_id) REFERENCES NarrativeEntityInstancesV2(id) ON DELETE CASCADE
        );
        CREATE TRIGGER IF NOT EXISTS trg_entity_welcome_validate BEFORE INSERT ON NarrativeEntityInstanceWelcomesV2
        WHEN NOT EXISTS (SELECT 1 FROM NarrativeEntityInstancesV2 i WHERE i.id=NEW.instance_id AND i.guild_id=NEW.guild_id AND i.context_id=NEW.context_id)
          OR NOT EXISTS (SELECT 1 FROM SceneChannelsV2 sc JOIN ScenesV2 s ON s.id=sc.scene_id WHERE sc.guild_id=NEW.guild_id AND sc.channel_id=NEW.channel_id AND sc.unlinked_at IS NULL AND s.context_id=NEW.context_id)
        BEGIN SELECT RAISE(ABORT,'Entity welcome Context mismatch'); END;

        CREATE TABLE IF NOT EXISTS ContextNarrativeEntityEventsV2 (
            id TEXT PRIMARY KEY, instance_id TEXT NOT NULL, guild_id TEXT NOT NULL, context_id TEXT NOT NULL,
            name TEXT NOT NULL, calendar_rule TEXT NOT NULL DEFAULT 'always', weekday_rule TEXT NOT NULL DEFAULT '*',
            time_rule TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'Europe/Paris', message_content TEXT,
            action_key TEXT NOT NULL DEFAULT 'none', action_payload TEXT, is_enabled INTEGER NOT NULL DEFAULT 1,
            last_run_key TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            legacy_event_id TEXT UNIQUE,
            FOREIGN KEY(instance_id) REFERENCES NarrativeEntityInstancesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(guild_id,context_id) REFERENCES Contexts(guild_id,id) ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS idx_context_entity_events_due ON ContextNarrativeEntityEventsV2(is_enabled,guild_id,context_id,instance_id);
        CREATE TRIGGER IF NOT EXISTS trg_context_entity_event_scope BEFORE INSERT ON ContextNarrativeEntityEventsV2
        WHEN NOT EXISTS (SELECT 1 FROM NarrativeEntityInstancesV2 i WHERE i.id=NEW.instance_id AND i.guild_id=NEW.guild_id AND i.context_id=NEW.context_id)
        BEGIN SELECT RAISE(ABORT,'Entity event Context mismatch'); END;
        CREATE TRIGGER IF NOT EXISTS trg_context_entity_event_immutable BEFORE UPDATE OF instance_id,guild_id,context_id,legacy_event_id ON ContextNarrativeEntityEventsV2
        BEGIN SELECT RAISE(ABORT,'Entity event scope is immutable'); END;

        CREATE TABLE IF NOT EXISTS ContextNarrativeEntityEventScopesV2 (
            event_id TEXT NOT NULL, guild_id TEXT NOT NULL, context_id TEXT NOT NULL, channel_id TEXT NOT NULL, created_at TEXT NOT NULL,
            PRIMARY KEY(event_id,channel_id), FOREIGN KEY(event_id) REFERENCES ContextNarrativeEntityEventsV2(id) ON DELETE CASCADE
        );
        CREATE TRIGGER IF NOT EXISTS trg_context_entity_event_scope_validate BEFORE INSERT ON ContextNarrativeEntityEventScopesV2
        WHEN NOT EXISTS (SELECT 1 FROM ContextNarrativeEntityEventsV2 e WHERE e.id=NEW.event_id AND e.guild_id=NEW.guild_id AND e.context_id=NEW.context_id)
          OR NOT EXISTS (SELECT 1 FROM SceneChannelsV2 sc JOIN ScenesV2 s ON s.id=sc.scene_id WHERE sc.guild_id=NEW.guild_id AND sc.channel_id=NEW.channel_id AND sc.unlinked_at IS NULL AND s.context_id=NEW.context_id)
        BEGIN SELECT RAISE(ABORT,'Entity event destination Context mismatch'); END;
        CREATE TABLE IF NOT EXISTS ContextNarrativeEntityEventRunsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL, guild_id TEXT NOT NULL, context_id TEXT NOT NULL,
            run_key TEXT NOT NULL, channel_id TEXT NOT NULL, message_id TEXT, status TEXT NOT NULL, error_message TEXT,
            attempt_token TEXT, external_effect_attempted INTEGER, lease_at TEXT, created_at TEXT NOT NULL,
            FOREIGN KEY(event_id) REFERENCES ContextNarrativeEntityEventsV2(id) ON DELETE CASCADE,
            UNIQUE(event_id,run_key,channel_id)
        );
        CREATE INDEX IF NOT EXISTS idx_context_entity_runs_scope ON ContextNarrativeEntityEventRunsV2(guild_id,context_id,event_id,status);
    `);

    if (!["NarrativeEntitiesV2","NarrativeEntityScopesV2","NarrativeEntityEventsV2","NarrativeEntityEventScopesV2","SceneChannelsV2","ScenesV2"].every(n => exists(db,n))) return;
    const contextForChannels = (guildId, channelIds) => {
        if (!channelIds.length) return null;
        const contexts = new Set();
        const q = db.prepare(`SELECT DISTINCT s.context_id FROM SceneChannelsV2 sc JOIN ScenesV2 s ON s.id=sc.scene_id
            WHERE sc.guild_id=? AND sc.channel_id=? AND sc.unlinked_at IS NULL AND s.context_id IS NOT NULL`);
        for (const id of channelIds) {
            const rows = q.all(guildId,id);
            if (rows.length !== 1) return null;
            contexts.add(rows[0].context_id);
        }
        return contexts.size === 1 ? [...contexts][0] : null;
    };
    const now = new Date().toISOString();
    db.transaction(() => {
        for (const d of db.prepare("SELECT * FROM NarrativeEntitiesV2 ORDER BY id").all()) {
            const scopes = db.prepare("SELECT channel_id FROM NarrativeEntityScopesV2 WHERE entity_id=?").all(d.id).map(x=>x.channel_id);
            const eventScopes = db.prepare(`SELECT s.channel_id FROM NarrativeEntityEventScopesV2 s JOIN NarrativeEntityEventsV2 e ON e.id=s.event_id WHERE e.entity_id=?`).all(d.id).map(x=>x.channel_id);
            const welcomes = exists(db,"NarrativeEntityChannelWelcomesV2")
                ? db.prepare("SELECT channel_id FROM NarrativeEntityChannelWelcomesV2 WHERE entity_id=?").all(d.id).map(x=>x.channel_id)
                : [];
            const contextId = contextForChannels(d.guild_id,[...new Set([...scopes,...eventScopes,...welcomes])]);
            if (!contextId) continue;
            const id = `entityinst_legacy_${d.id}`;
            db.prepare(`INSERT OR IGNORE INTO NarrativeEntityInstancesV2(id,entity_definition_id,guild_id,context_id,is_active,created_by,created_at,updated_at,legacy_entity_id) VALUES(?,?,?,?,?,?,?,?,?)`)
                .run(id,d.id,d.guild_id,contextId,d.is_enabled,d.created_by,d.created_at||now,d.updated_at||now,d.id);
            const insScope=db.prepare(`INSERT OR IGNORE INTO NarrativeEntityInstanceScopesV2(instance_id,guild_id,context_id,channel_id,created_at) VALUES(?,?,?,?,?)`);
            for (const channelId of scopes) insScope.run(id,d.guild_id,contextId,channelId,now);
            const insWelcome=db.prepare(`INSERT OR IGNORE INTO NarrativeEntityInstanceWelcomesV2(instance_id,guild_id,context_id,channel_id,welcomed_at) VALUES(?,?,?,?,?)`);
            if (exists(db,"NarrativeEntityChannelWelcomesV2")) {
                for (const welcome of db.prepare("SELECT * FROM NarrativeEntityChannelWelcomesV2 WHERE entity_id=?").all(d.id)) {
                    insWelcome.run(id,d.guild_id,contextId,welcome.channel_id,welcome.welcomed_at);
                }
            }
            const insertEvent=db.prepare(`INSERT OR IGNORE INTO ContextNarrativeEntityEventsV2
                (id,instance_id,guild_id,context_id,name,calendar_rule,weekday_rule,time_rule,timezone,message_content,action_key,action_payload,is_enabled,last_run_key,created_by,created_at,updated_at,legacy_event_id)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
            const insertEventScope=db.prepare(`INSERT OR IGNORE INTO ContextNarrativeEntityEventScopesV2(event_id,guild_id,context_id,channel_id,created_at) VALUES(?,?,?,?,?)`);
            const insertRun=db.prepare(`INSERT OR IGNORE INTO ContextNarrativeEntityEventRunsV2
                (event_id,guild_id,context_id,run_key,channel_id,message_id,status,error_message,attempt_token,external_effect_attempted,lease_at,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
            for (const event of db.prepare("SELECT * FROM NarrativeEntityEventsV2 WHERE entity_id=? ORDER BY id").all(d.id)) {
                const eventId=`entityevent_legacy_${event.id}`;
                insertEvent.run(eventId,id,d.guild_id,contextId,event.name,event.calendar_rule,event.weekday_rule,event.time_rule,event.timezone,event.message_content,event.action_key,event.action_payload,event.is_enabled,event.last_run_key,event.created_by,event.created_at,event.updated_at,event.id);
                for (const scope of db.prepare("SELECT * FROM NarrativeEntityEventScopesV2 WHERE event_id=?").all(event.id)) {
                    insertEventScope.run(eventId,d.guild_id,contextId,scope.channel_id,scope.created_at);
                }
                if (exists(db,"NarrativeEntityEventRunsV2")) {
                    for (const run of db.prepare("SELECT * FROM NarrativeEntityEventRunsV2 WHERE event_id=? AND channel_id IS NOT NULL").all(event.id)) {
                        if (contextForChannels(d.guild_id,[run.channel_id]) !== contextId) continue;
                        insertRun.run(eventId,d.guild_id,contextId,run.run_key,run.channel_id,run.message_id,run.status,run.error_message,run.attempt_token,run.external_effect_attempted,run.lease_at,run.created_at);
                    }
                }
            }
        }
    })();
};
