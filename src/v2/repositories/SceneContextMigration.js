const ContextRepository = require('./ContextRepository');
const ContextService = require('../services/contexts/ContextService');

// No table rebuild. The immediate lock serializes DDL + lazy default + backfill.
module.exports = function initializeSceneContexts(db) {
    return db.transaction(() => {
        require('./ContextSchema')(db);
        const contexts = new ContextService(new ContextRepository(db));
        const exists = table => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
        const addContext = table => {
            if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === 'context_id')) {
                db.exec(`ALTER TABLE ${table} ADD COLUMN context_id TEXT REFERENCES Contexts(id) ON DELETE RESTRICT`);
            }
        };
        for (const table of ['ScenesV2', 'SceneAssistantCyclesV2', 'SceneStartProposalsV2', 'GreyFateDuos']) {
            if (!exists(table)) continue;
            addContext(table);
            for (const { guild_id } of db.prepare(`SELECT DISTINCT guild_id FROM ${table} WHERE context_id IS NULL`).all()) {
                const context = contexts.ensureDefault(guild_id);
                db.prepare(`UPDATE ${table} SET context_id = ? WHERE guild_id = ? AND context_id IS NULL`).run(context.id, guild_id);
            }
            const indexColumns = table === 'ScenesV2' ? 'guild_id, context_id, status' : 'guild_id, context_id';
            db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_context ON ${table}(${indexColumns});
                CREATE TRIGGER IF NOT EXISTS guard_${table}_context_insert
                BEFORE INSERT ON ${table} WHEN NEW.context_id IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM Contexts WHERE id = NEW.context_id AND guild_id = NEW.guild_id AND is_active = 1)
                BEGIN SELECT RAISE(ABORT, 'Invalid scene Context'); END;
                CREATE TRIGGER IF NOT EXISTS guard_${table}_context_update
                BEFORE UPDATE OF context_id, guild_id ON ${table}
                WHEN NEW.context_id IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM Contexts WHERE id = NEW.context_id AND guild_id = NEW.guild_id)
                BEGIN SELECT RAISE(ABORT, 'Invalid scene Context'); END;`);
        }
        for (const table of ['ScenesV2', 'SceneAssistantCyclesV2', 'GreyFateDuos']) {
            if (!exists(table)) continue;
            db.exec(`CREATE TRIGGER IF NOT EXISTS immutable_${table}_context
                BEFORE UPDATE OF context_id, guild_id ON ${table}
                WHEN OLD.context_id IS NOT NULL AND (NEW.context_id IS NOT OLD.context_id OR NEW.guild_id IS NOT OLD.guild_id)
                BEGIN SELECT RAISE(ABORT, 'Scene Context ownership is immutable'); END;`);
        }
        // These rows belong to their scene, never to an independently selected Context.
        // Copies are filled for legacy INSERTs as well; the scene remains authoritative.
        for (const table of ['SceneChannelsV2', 'SceneParticipantsV2', 'SceneClosurePromptsV2', 'SceneClosureVotesV2']) {
            if (!exists(table)) continue;
            addContext(table);
            const columns = db.prepare(`PRAGMA table_info(${table})`).all();
            const guildGuard = columns.some(c => c.name === 'guild_id') ? 'AND guild_id = NEW.guild_id' : '';
            const guildUpdate = guildGuard ? ', guild_id' : '';
            db.exec(`UPDATE ${table} SET context_id = (SELECT context_id FROM ScenesV2 WHERE id = scene_id)
                WHERE context_id IS NULL;
                CREATE TRIGGER IF NOT EXISTS bind_${table}_context AFTER INSERT ON ${table}
                WHEN NEW.context_id IS NULL
                BEGIN UPDATE ${table} SET context_id = (SELECT context_id FROM ScenesV2 WHERE id = NEW.scene_id)
                    WHERE rowid = NEW.rowid; END;
                CREATE TRIGGER IF NOT EXISTS guard_${table}_context_insert BEFORE INSERT ON ${table}
                WHEN NEW.context_id IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM ScenesV2 WHERE id = NEW.scene_id AND context_id = NEW.context_id ${guildGuard})
                BEGIN SELECT RAISE(ABORT, 'Invalid scene association Context'); END;
                CREATE TRIGGER IF NOT EXISTS guard_${table}_context_update BEFORE UPDATE OF context_id, scene_id${guildUpdate} ON ${table}
                WHEN NOT EXISTS (
                    SELECT 1 FROM ScenesV2 WHERE id = NEW.scene_id AND context_id IS NEW.context_id ${guildGuard})
                BEGIN SELECT RAISE(ABORT, 'Invalid scene association Context'); END;`);
            if (table === 'SceneChannelsV2' && columns.some(c => c.name === 'unlinked_at')) {
                db.exec(`CREATE INDEX IF NOT EXISTS idx_scene_channels_v2_scene_active
                    ON SceneChannelsV2(scene_id) WHERE unlinked_at IS NULL`);
            }
        }
        // A warning is a derived pair, not a scene: expose both exact ownerships by join.
        if (exists('SceneTimelineWarningsV2')) db.exec(`CREATE VIEW IF NOT EXISTS SceneTimelineWarningContextsV2 AS
            SELECT warning.*, a.guild_id, a.context_id, b.context_id AS other_context_id
            FROM SceneTimelineWarningsV2 warning JOIN ScenesV2 a ON a.id = warning.scene_a_id
            JOIN ScenesV2 b ON b.id = warning.scene_b_id`);
    }).immediate();
};
