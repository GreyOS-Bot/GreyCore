const test = require('node:test');
const assert = require('node:assert/strict');
const { createIsolatedDatabase, withMutedConsole } = require('./helpers/isolatedDatabase');

test('3B bootstrap application complet ancienne DB avec scènes x2 conserve historique et intégrité', async t => {
    const isolated = createIsolatedDatabase();
    t.after(() => isolated.cleanup());
    const db = isolated.database;
    db.pragma('foreign_keys = ON');
    db.exec(`CREATE TABLE Guilds(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
        INSERT INTO Guilds VALUES ('history','Historique','2020'),('empty','Vide','2020');
        CREATE TABLE ScenesV2 (
            id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active', started_at TEXT NOT NULL, last_rp_message_at TEXT,
            rp_message_count INTEGER NOT NULL DEFAULT 0, threshold_notified_at TEXT, created_by TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL, ended_at TEXT,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE);
        INSERT INTO ScenesV2(id,guild_id,title,status,started_at,created_at,updated_at)
            VALUES ('preserved','history','Scène historique','closed','2020','2020','2020');`);
    const before = db.prepare('SELECT * FROM ScenesV2').all();
    const { initializeDatabase } = require('../src/database/schema');
    await withMutedConsole(() => initializeDatabase());
    const migrated = db.prepare('SELECT * FROM ScenesV2').all();
    assert.deepEqual(migrated.map(({ context_id, ...row }) => row), before);
    assert.ok(migrated[0].context_id);
    const contexts = db.prepare('SELECT * FROM Contexts').all();
    assert.equal(contexts.length, 1);
    assert.equal(contexts[0].guild_id, 'history');
    const schema = db.prepare('SELECT type,name,sql FROM sqlite_master ORDER BY type,name').all();
    await withMutedConsole(() => initializeDatabase());
    assert.deepEqual(db.prepare('SELECT * FROM ScenesV2').all(), migrated);
    assert.deepEqual(db.prepare('SELECT * FROM Contexts').all(), contexts);
    assert.deepEqual(db.prepare('SELECT type,name,sql FROM sqlite_master ORDER BY type,name').all(), schema);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
});
