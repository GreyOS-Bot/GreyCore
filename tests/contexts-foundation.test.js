const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const initialize = require('../src/database/schemaContexts');
const Repository = require('../src/v2/repositories/ContextRepository');
const Service = require('../src/v2/services/contexts/ContextService');
const Resolution = require('../src/v2/services/contexts/ContextResolutionService');
const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function fixture(t) {
    const db = new Database(':memory:');
    t.after(() => db.close());
    db.pragma('foreign_keys = ON');
    db.exec("CREATE TABLE Guilds(id TEXT PRIMARY KEY); INSERT INTO Guilds VALUES ('a'), ('b');");
    initialize(db);
    const repository = new Repository(db);
    const service = new Service(repository);
    const resolution = new Resolution(service);
    const create = (key, extra = {}) => service.create({ guildId: 'a', key, name: key, ...extra });
    return { db, repository, service, resolution, create };
}
test('3A création générique et premier défaut', t => {
    const { create, repository } = fixture(t);
    const row = create('alpha', { description: 'Narration', createdBy: 'actor' });
    assert.equal(row.guild_id, 'a'); assert.equal(row.is_default, 1);
    assert.equal(row.created_by, 'actor'); assert.equal(row.description, 'Narration');
    assert.equal(repository.getByKey('a', 'alpha').id, row.id);
});
test('3A unicité de clé locale et même clé dans deux Guilds', t => {
    const { create } = fixture(t);
    create('alpha'); assert.throws(() => create('alpha'), /existe déjà/);
    assert.equal(create('alpha', { guildId: 'b' }).guild_id, 'b');
});
test('3A défaut unique et changement atomique sans effet cross-guild', t => {
    const { create, service, repository, db } = fixture(t);
    const first = create('first'); const next = create('next');
    const foreign = create('foreign', { guildId: 'b' });
    service.setDefault('a', next.id);
    assert.equal(repository.getById('a', first.id).is_default, 0);
    assert.equal(repository.getDefault('a').id, next.id);
    assert.throws(() => service.setDefault('a', foreign.id), /introuvable/);
    assert.equal(repository.getDefault('a').id, next.id);
    assert.equal(repository.getDefault('b').id, foreign.id);
    assert.throws(() => db.prepare('UPDATE Contexts SET is_default = 1 WHERE id = ?').run(first.id), /UNIQUE/);
});
test('3A parent même Guild et chaîne héritage ordonnée', t => {
    const { create, service } = fixture(t);
    const parent = create('root'); const child = create('child', { parentContextId: parent.id });
    assert.deepEqual(service.lineage('a', child.id).map(row => row.id), [parent.id, child.id]);
});
test('3A parent cross-guild ou inexistant refusé', t => {
    const { create } = fixture(t);
    const foreign = create('foreign', { guildId: 'b' });
    assert.throws(() => create('child', { parentContextId: foreign.id }), /introuvable/);
    assert.throws(() => create('child', { parentContextId: 'missing' }), /introuvable/);
});
test('3A cycles directs et indirects refusés sans écriture', t => {
    const { create, service } = fixture(t);
    const parent = create('root'); const child = create('child', { parentContextId: parent.id });
    const leaf = create('leaf', { parentContextId: child.id });
    assert.throws(() => service.update('a', parent.id, { parent_context_id: parent.id }), /Cycle/);
    assert.throws(() => service.update('a', parent.id, { parent_context_id: leaf.id }), /Cycle/);
    assert.equal(service.required('a', parent.id).parent_context_id, null);
});
test('3A résolution explicite prioritaire et isolation sans fallback', t => {
    const { create, resolution, repository } = fixture(t);
    create('default'); const other = create('other');
    assert.equal(resolution.resolve({ guildId: 'a', contextId: other.id }).id, other.id);
    assert.throws(() => resolution.resolve({ guildId: 'b', contextId: other.id }), /introuvable/);
    assert.throws(() => resolution.resolve({ guildId: 'a', contextId: 'missing' }), /introuvable/);
    assert.equal(repository.getDefault('b'), null);
});
test('3A ancienne Guild sans contexte : défaut paresseux idempotent', t => {
    const { repository, resolution } = fixture(t);
    assert.deepEqual(repository.listByGuild('a'), []);
    const first = resolution.resolve({ guildId: 'a' });
    assert.equal(first.name, 'Contexte par défaut');
    assert.equal(resolution.resolve({ guildId: 'a' }).id, first.id);
    assert.equal(repository.listByGuild('a').length, 1);
    assert.deepEqual(repository.listByGuild('b'), []);
    assert.throws(() => resolution.resolve({ guildId: 'unknown' }), /Guild/);
});
test('3A migration ancienne DB additive deux fois et données inchangées', t => {
    const { db, create } = fixture(t);
    db.exec("CREATE TABLE LegacyData(id INTEGER PRIMARY KEY, value TEXT); INSERT INTO LegacyData VALUES(1, 'préservé');");
    const row = create('keep');
    initialize(db); initialize(db);
    assert.deepEqual(db.prepare('SELECT * FROM LegacyData').all(), [{ id: 1, value: 'préservé' }]);
    assert.deepEqual(db.prepare('SELECT * FROM Contexts').all(), [row]);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
});
test('3A mise à jour autorisée sans changement de scope et fuite cross-guild', t => {
    const { create, service, repository } = fixture(t);
    const row = create('keep');
    service.update('a', row.id, { name: 'Nouveau', description: 'Texte', guild_id: 'b', is_default: 0 });
    assert.equal(service.required('a', row.id).name, 'Nouveau');
    assert.equal(service.required('a', row.id).is_default, 1);
    assert.equal(repository.getById('b', row.id), null);
    assert.equal(repository.getByKey('b', row.key), null);
    assert.deepEqual(service.listByGuild('b'), []);
    assert.throws(() => service.update('b', row.id, { name: 'Volé' }), /introuvable/);
});
test('3A contraintes DB de parent et aucune API delete', t => {
    const { create, repository, service, db } = fixture(t);
    const root = create('root'); create('child', { parentContextId: root.id });
    const foreign = create('foreign', { guildId: 'b' });
    assert.throws(() => db.prepare('UPDATE Contexts SET parent_context_id = ? WHERE id = ?').run(foreign.id, root.id), /FOREIGN KEY/);
    assert.throws(() => db.prepare('DELETE FROM Contexts WHERE id = ?').run(root.id), /FOREIGN KEY/);
    assert.equal(repository.delete, undefined); assert.equal(service.delete, undefined);
});
test('3A valeurs invalides et parent inactif refusés', t => {
    const { create, db, service, resolution } = fixture(t);
    assert.throws(() => create('BAD KEY'), /Clé/);
    assert.throws(() => create('ok', { name: ' ' }), /Nom/);
    create('default'); const archived = create('inactive');
    db.prepare('UPDATE Contexts SET is_active = 0 WHERE id = ?').run(archived.id);
    assert.throws(() => create('child', { parentContextId: archived.id }), /actif/);
    assert.throws(() => service.setDefault('a', archived.id), /actif/);
    assert.throws(() => resolution.resolve({ guildId: 'a', contextId: archived.id }), /inactif/);
});

test('3A ensureDefault concurrent sur deux connexions SQLite retourne un seul contexte', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'greycore-context-concurrency-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const filename = path.join(directory, 'test.sqlite');
    const db = new Database(filename);
    db.exec("CREATE TABLE Guilds(id TEXT PRIMARY KEY); INSERT INTO Guilds VALUES ('a');");
    initialize(db); db.close();
    const gate = new SharedArrayBuffer(4);
    const workers = [0, 1].map(() => new Worker(`
        const { parentPort, workerData } = require('node:worker_threads');
        const Database = require(workerData.databaseModule);
        const Repository = require(workerData.repositoryModule);
        const Service = require(workerData.serviceModule);
        const db = new Database(workerData.filename, { timeout: 5000 });
        parentPort.postMessage({ ready: true });
        Atomics.wait(new Int32Array(workerData.gate), 0, 0);
        try {
            const result = new Service(new Repository(db)).ensureDefault('a');
            parentPort.postMessage({ id: result.id });
        } finally { db.close(); }
    `, { eval: true, workerData: {
        filename, gate, databaseModule: require.resolve('better-sqlite3'),
        repositoryModule: require.resolve('../src/v2/repositories/ContextRepository'),
        serviceModule: require.resolve('../src/v2/services/contexts/ContextService')
    } }));
    t.after(async () => { await Promise.all(workers.map(worker => worker.terminate())); });
    let ready = 0;
    const results = await Promise.all(workers.map(worker => new Promise((resolve, reject) => {
        let id;
        worker.on('error', reject);
        worker.on('message', message => {
            if (message.ready && ++ready === 2) {
                Atomics.store(new Int32Array(gate), 0, 1);
                Atomics.notify(new Int32Array(gate), 0);
            }
            if (message.id) id = message.id;
        });
        worker.on('exit', code => code === 0 && id ? resolve(id) : reject(new Error(`worker exit ${code}`)));
    })));
    assert.equal(results[0], results[1]);
    const check = new Database(filename);
    try {
        assert.equal(check.prepare('SELECT COUNT(*) AS n FROM Contexts').get().n, 1);
        assert.equal(check.prepare('SELECT is_default FROM Contexts').get().is_default, 1);
    } finally { check.close(); }
});

test('3A erreur intermédiaire setDefault restaure intégralement le défaut', t => {
    const { db, create, service, repository } = fixture(t);
    const first = create('first'); const second = create('second');
    db.exec(`CREATE TRIGGER reject_default BEFORE UPDATE OF is_default ON Contexts
        WHEN NEW.key = 'second' AND NEW.is_default = 1
        BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;`);
    assert.throws(() => service.setDefault('a', second.id), /simulated failure/);
    assert.deepEqual(repository.getDefault('a'), first);
    assert.equal(repository.getById('a', second.id).is_default, 0);
});

test('3A défaut actif protégé en SQL et champs préparatoires non exposés en update', t => {
    const { db, create, service, repository } = fixture(t);
    const row = create('first');
    assert.throws(() => db.prepare('UPDATE Contexts SET is_active = 0 WHERE id = ?').run(row.id), /CHECK/);
    service.update('a', row.id, { is_active: 0, is_default: 0 });
    assert.equal(repository.getDefault('a').is_active, 1);
    const next = create('next'); service.setDefault('a', next.id);
    assert.equal(repository.getDefault('a').is_active, 1);
});

test('3A lineage refuse un cycle DB corrompu sans boucle infinie', t => {
    const { db, create, service } = fixture(t);
    const a = create('a'); const b = create('b', { parentContextId: a.id });
    db.prepare('UPDATE Contexts SET parent_context_id = ? WHERE id = ?').run(b.id, a.id);
    assert.throws(() => service.lineage('a', b.id), /Cycle/);
});

test('3A clés vides, espaces et dépassement refusés sans normalisation implicite', t => {
    const { create } = fixture(t);
    for (const key of ['', '   ', ' key', 'key ', 'A', 'x'.repeat(65)]) {
        assert.throws(() => create(key), /Clé/);
    }
    assert.equal(create('x'.repeat(64)).key.length, 64);
});
