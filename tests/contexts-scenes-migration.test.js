const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const migrate = require('../src/database/schemaSceneContexts');
const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function oldDatabase(t) {
    const db = new Database(':memory:');
    t.after(() => db.close());
    db.pragma('foreign_keys = ON');
    db.exec(`CREATE TABLE Guilds(id TEXT PRIMARY KEY);
        INSERT INTO Guilds VALUES ('a'), ('b'), ('empty');
        CREATE TABLE ScenesV2(id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, status TEXT);
        CREATE TABLE SceneAssistantCyclesV2(guild_id TEXT, channel_id TEXT, status TEXT, PRIMARY KEY(guild_id, channel_id));
        CREATE TABLE SceneChannelsV2(id INTEGER PRIMARY KEY, scene_id TEXT REFERENCES ScenesV2(id), guild_id TEXT, channel_id TEXT);
        CREATE TABLE SceneParticipantsV2(scene_id TEXT REFERENCES ScenesV2(id), character_id TEXT, PRIMARY KEY(scene_id, character_id));
        CREATE TABLE SceneClosurePromptsV2(scene_id TEXT PRIMARY KEY REFERENCES ScenesV2(id), guild_id TEXT);
        CREATE TABLE SceneClosureVotesV2(scene_id TEXT REFERENCES ScenesV2(id), discord_user_id TEXT, PRIMARY KEY(scene_id, discord_user_id));
        CREATE TABLE GreyFateDuos(duo_id TEXT PRIMARY KEY, guild_id TEXT, thread_id TEXT);
        INSERT INTO ScenesV2 VALUES ('one', 'a', 'active'), ('two', 'a', 'closed'), ('three', 'b', 'active');
        INSERT INTO SceneAssistantCyclesV2 VALUES ('a', 'channel', 'active');
        INSERT INTO SceneChannelsV2 VALUES (7, 'one', 'a', 'channel');
        INSERT INTO SceneParticipantsV2 VALUES ('one', 'character');
        INSERT INTO SceneClosurePromptsV2 VALUES ('one', 'a');
        INSERT INTO SceneClosureVotesV2 VALUES ('one', 'user');
        INSERT INTO GreyFateDuos VALUES ('duo', 'b', 'thread');`);
    return db;
}

test('3B ancienne DB sans Contexts : backfill conserve chaque ID/Guild/association et integrity', t => {
    const db = oldDatabase(t);
    const tables = ['ScenesV2', 'SceneAssistantCyclesV2', 'SceneChannelsV2', 'SceneParticipantsV2',
        'SceneClosurePromptsV2', 'SceneClosureVotesV2', 'GreyFateDuos'];
    const before = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table}`).all()]));
    migrate(db);
    for (const table of tables) {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        assert.deepEqual(rows.map(({ context_id, ...row }) => row), before[table], table);
        assert.ok(rows.every(row => row.context_id), table);
    }
    const sceneContext = db.prepare("SELECT context_id FROM ScenesV2 WHERE id = 'one'").get().context_id;
    for (const table of ['SceneChannelsV2', 'SceneParticipantsV2', 'SceneClosurePromptsV2', 'SceneClosureVotesV2']) {
        assert.equal(db.prepare(`SELECT context_id FROM ${table}`).get().context_id, sceneContext);
    }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM Contexts').get().n, 2);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM Contexts WHERE guild_id = 'empty'").get().n, 0);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    const after = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table}`).all()]));
    const contexts = db.prepare('SELECT * FROM Contexts ORDER BY id').all();
    migrate(db);
    assert.deepEqual(db.prepare('SELECT * FROM Contexts ORDER BY id').all(), contexts);
    for (const table of tables) assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all(), after[table]);
});

test('3B échec de backfill annule ensemble colonnes et Contexts, sans perte historique', t => {
    const db = oldDatabase(t);
    db.exec("CREATE TRIGGER reject_backfill BEFORE UPDATE ON ScenesV2 BEGIN SELECT RAISE(ABORT, 'forced'); END;");
    assert.throws(() => migrate(db), /forced/);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'Contexts'").get(), undefined);
    assert.ok(!db.pragma('table_info(ScenesV2)').some(c => c.name === 'context_id'));
    assert.equal(db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n, 3);
});

test('3B contraintes de rattachement et compatibilité des INSERTs legacy des associations', t => {
    const db = oldDatabase(t);
    migrate(db);
    const a = db.prepare("SELECT context_id FROM ScenesV2 WHERE id = 'one'").get().context_id;
    const b = db.prepare("SELECT context_id FROM ScenesV2 WHERE id = 'three'").get().context_id;
    assert.throws(() => db.prepare("INSERT INTO ScenesV2 VALUES ('bad','a','active',?)").run(b));
    assert.throws(() => db.prepare("UPDATE ScenesV2 SET context_id = ? WHERE id = 'one'").run(b));
    assert.throws(() => db.prepare("INSERT INTO SceneParticipantsV2 VALUES ('one','bad',?)").run(b));
    assert.throws(() => db.exec("UPDATE SceneParticipantsV2 SET context_id = NULL WHERE scene_id = 'one'"));
    assert.throws(() => db.exec("UPDATE SceneParticipantsV2 SET scene_id = 'three', context_id = NULL WHERE scene_id = 'one'"));
    assert.throws(() => db.exec("UPDATE SceneChannelsV2 SET guild_id = 'b' WHERE id = 7"));
    assert.throws(() => db.exec("INSERT INTO SceneChannelsV2(id,scene_id,guild_id,channel_id) VALUES (8,'one','b','forged')"));
    db.exec("INSERT INTO SceneParticipantsV2(scene_id,character_id) VALUES ('one','legacy')");
    assert.equal(db.prepare("SELECT context_id FROM SceneParticipantsV2 WHERE character_id = 'legacy'").get().context_id, a);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
});

test('3B deux migrations concurrentes convergent vers le même default sans doublon', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'greycore-context-scenes-'));
    const filename = path.join(directory, 'test.sqlite');
    const db = new Database(filename);
    db.exec("CREATE TABLE Guilds(id TEXT PRIMARY KEY); INSERT INTO Guilds VALUES ('guild'); CREATE TABLE ScenesV2(id TEXT PRIMARY KEY,guild_id TEXT,status TEXT); INSERT INTO ScenesV2 VALUES ('scene','guild','active');");
    db.close();
    const gate = new SharedArrayBuffer(4);
    const workers = [0, 1].map(() => new Worker(`
        const { parentPort, workerData } = require('node:worker_threads');
        const Database = require(workerData.sqlite);
        const db = new Database(workerData.filename, { timeout: 10000 });
        parentPort.postMessage({ ready: true });
        Atomics.wait(new Int32Array(workerData.gate), 0, 0);
        try {
            require(workerData.migrate)(db);
            parentPort.postMessage({ id: db.prepare('SELECT context_id FROM ScenesV2').get().context_id });
        } finally { db.close(); }
    `, { eval: true, workerData: { filename, gate, sqlite: require.resolve('better-sqlite3'), migrate: require.resolve('../src/database/schemaSceneContexts') } }));
    t.after(async () => {
        await Promise.all(workers.map(worker => worker.terminate()));
        fs.rmSync(directory, { recursive: true, force: true });
    });
    let ready = 0;
    const ids = await Promise.all(workers.map(worker => new Promise((resolve, reject) => {
        worker.on('error', reject);
        worker.on('exit', code => { if (code) reject(new Error(`worker exit ${code}`)); });
        worker.on('message', message => {
            if (message.ready) {
                if (++ready === 2) { Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0); }
            } else resolve(message.id);
        });
    })));
    assert.equal(ids[0], ids[1]);
    const verified = new Database(filename);
    try {
        assert.equal(verified.prepare('SELECT COUNT(*) n FROM Contexts').get().n, 1);
        assert.equal(verified.pragma('integrity_check', { simple: true }), 'ok');
    } finally { verified.close(); }
});
