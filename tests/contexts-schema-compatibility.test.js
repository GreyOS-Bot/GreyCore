const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { stubModule } = require('./helpers/moduleStub');

test('3A bootstrap complet ancienne DB deux fois sans modification de Guild existante', t => {
    const db = new Database(':memory:'); t.after(() => db.close());
    db.exec("CREATE TABLE Guilds(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL); INSERT INTO Guilds VALUES ('legacy', 'Ancien serveur', '2020-01-01');");
    stubModule('src/database/database.js', db);
    const { initializeDatabase } = require('../src/database/schema');
    initializeDatabase();
    const before = db.prepare("SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name").all();
    initializeDatabase();
    assert.deepEqual(db.prepare("SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name").all(), before);
    assert.deepEqual(db.prepare('SELECT * FROM Guilds').all(), [{ id: 'legacy', name: 'Ancien serveur', created_at: '2020-01-01' }]);
    assert.deepEqual(db.prepare('SELECT * FROM Contexts').all(), []);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    const { resolution } = require('../src/v2/services/contexts');
    assert.equal(resolution.resolve({ guildId: 'legacy' }).guild_id, 'legacy');
});
