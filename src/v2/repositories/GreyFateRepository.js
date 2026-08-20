const db = require("../../database/database");

class GreyFateRepository {
    initializeSchema() {
        db.exec(`
            CREATE TABLE IF NOT EXISTS GreyFateEvents (
                event_id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                status TEXT NOT NULL,
                payload TEXT NOT NULL,
                received_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS GreyFateDuos (
                duo_id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                thread_id TEXT NOT NULL,
                male_user_id TEXT NOT NULL,
                female_user_id TEXT NOT NULL,
                male_character TEXT,
                female_character TEXT,
                status TEXT NOT NULL DEFAULT 'READY',
                scene_started_at TEXT,
                closed_at TEXT,
                updated_at TEXT NOT NULL,
                UNIQUE(event_id, thread_id)
            );
            CREATE TABLE IF NOT EXISTS GreyFateOperations (
                operation_key TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                processed_at TEXT NOT NULL
            );
        `);
        const columns = new Set(
            db.prepare("PRAGMA table_info(GreyFateDuos)").all().map(column => column.name)
        );
        for (const [name, type] of [
            ["welcome_sent_at", "TEXT"],
            ["closure_prompt_sent_at", "TEXT"],
            ["last_error", "TEXT"]
        ]) {
            if (!columns.has(name)) db.exec(`ALTER TABLE GreyFateDuos ADD COLUMN ${name} ${type}`);
        }
    }

    hasOperation(operationKey) {
        return Boolean(db.prepare("SELECT 1 FROM GreyFateOperations WHERE operation_key=?").get(operationKey));
    }

    storeOperation(operationKey, eventType, processedAt) {
        db.prepare("INSERT INTO GreyFateOperations(operation_key,event_type,processed_at) VALUES(?,?,?)")
            .run(operationKey, eventType, processedAt);
    }

    upsertEvent(payload, now) {
        db.prepare("INSERT INTO GreyFateEvents(event_id,guild_id,status,payload,received_at,updated_at) VALUES(?,?,'ACTIVE',?,?,?) ON CONFLICT(event_id) DO UPDATE SET status='ACTIVE',payload=excluded.payload,updated_at=excluded.updated_at")
            .run(payload.eventId, payload.guildId, JSON.stringify(payload), now, now);
    }

    upsertDuo(payload, duo, now) {
        db.prepare("INSERT INTO GreyFateDuos(duo_id,event_id,guild_id,thread_id,male_user_id,female_user_id,male_character,female_character,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(duo_id) DO UPDATE SET thread_id=excluded.thread_id,male_character=excluded.male_character,female_character=excluded.female_character,updated_at=excluded.updated_at")
            .run(duo.duoId, payload.eventId, payload.guildId, duo.threadId, duo.maleUserId, duo.femaleUserId, duo.maleCharacter, duo.femaleCharacter, now);
    }

    getDuo(duoId) {
        return db.prepare("SELECT * FROM GreyFateDuos WHERE duo_id=?").get(duoId);
    }

    markWelcome(duoId, now) {
        db.prepare("UPDATE GreyFateDuos SET welcome_sent_at=?,last_error=NULL,updated_at=? WHERE duo_id=?")
            .run(now, now, duoId);
    }

    markError(duoId, error, now) {
        db.prepare("UPDATE GreyFateDuos SET last_error=?,updated_at=? WHERE duo_id=?")
            .run(String(error).slice(0, 1000), now, duoId);
    }

    markClosurePrompt(duoId, now) {
        db.prepare("UPDATE GreyFateDuos SET closure_prompt_sent_at=?,last_error=NULL,updated_at=? WHERE duo_id=?")
            .run(now, now, duoId);
    }

    markStarted(duoId, now) {
        db.prepare("UPDATE GreyFateDuos SET status='ACTIVE',scene_started_at=?,updated_at=? WHERE duo_id=?")
            .run(now, now, duoId);
    }

    markContinued(duoId, now) {
        db.prepare("UPDATE GreyFateDuos SET closure_prompt_sent_at=NULL,last_error=NULL,updated_at=? WHERE duo_id=?")
            .run(now, duoId);
    }

    markClosed(duoId, now) {
        db.prepare("UPDATE GreyFateDuos SET status='COMPLETED',closed_at=?,updated_at=? WHERE duo_id=?")
            .run(now, now, duoId);
    }

    getLatestEvent(guildId) {
        return db.prepare("SELECT * FROM GreyFateEvents WHERE guild_id=? ORDER BY received_at DESC LIMIT 1")
            .get(guildId);
    }

    getDuosByEvent(eventId) {
        return db.prepare("SELECT * FROM GreyFateDuos WHERE event_id=? ORDER BY duo_id").all(eventId);
    }
}

module.exports = new GreyFateRepository();
