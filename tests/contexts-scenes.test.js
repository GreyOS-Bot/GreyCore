const test = require('node:test');
const assert = require('node:assert/strict');
const { createIsolatedDatabase } = require('./helpers/isolatedDatabase');
const ContextRepository = require('../src/v2/repositories/ContextRepository');
const ContextService = require('../src/v2/services/contexts/ContextService');

function fixture(t) {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    t.after(() => isolated.cleanup());
    const db = isolated.database;
    db.exec("INSERT INTO Guilds(id,name,created_at) VALUES ('a','A','now'),('b','B','now'),('empty','Empty','now')");
    for (const name of ['SceneAssistantRepository', 'GreyFateRepository']) {
        delete require.cache[require.resolve(`../src/v2/repositories/${name}`)];
    }
    delete require.cache[require.resolve('../src/v2/managers/SceneAssistantV2Manager')];
    const manager = require('../src/v2/managers/SceneAssistantV2Manager');
    const contexts = new ContextService(new ContextRepository(db));
    const a = contexts.ensureDefault('a');
    const b = contexts.create({ guildId: 'a', key: 'child', name: 'Child', parentContextId: a.id });
    const c = contexts.ensureDefault('b');
    const create = (guildId, contextId, channelId) => manager.createScene({
        guildId, contextId, channelId, title: channelId, createdBy: 'creator'
    });
    return { db, manager, contexts, a, b, c, create };
}

test('3B créations default/explicite, absence d’héritage, listes et actives isolées', t => {
    const f = fixture(t);
    const one = f.create('a', undefined, 'one');
    const two = f.create('a', f.b.id, 'two');
    const three = f.create('b', f.c.id, 'three');
    assert.equal(one.context_id, f.a.id);
    assert.equal(two.context_id, f.b.id);
    assert.deepEqual(f.manager.getScenes('a', f.a.id).map(s => s.id), [one.id]);
    assert.deepEqual(f.manager.getActiveScenes('a', f.b.id).map(s => s.id), [two.id]);
    assert.deepEqual(f.manager.getActiveScenes('b', f.c.id).map(s => s.id), [three.id]);
    assert.equal(f.manager.getActiveSceneByChannel('a', 'two', f.a.id), null);
    assert.equal(f.manager.getScene(three.id, { guildId: 'a', contextId: f.a.id }), null);
    assert.throws(() => f.manager.getActiveScenes('a', f.c.id));
    assert.equal(f.db.prepare('SELECT context_id FROM SceneChannelsV2 WHERE scene_id = ?').get(two.id).context_id, f.b.id);
    assert.equal(f.db.pragma('integrity_check', { simple: true }), 'ok');
});

test('3B invalid/cross-Guild/inactif ne créent aucune scène ni lien', t => {
    const f = fixture(t);
    for (const id of ['missing', '', f.c.id]) assert.throws(() => f.create('a', id, 'bad'));
    f.db.prepare('UPDATE Contexts SET is_active = 0 WHERE id = ?').run(f.b.id);
    assert.throws(() => f.create('a', f.b.id, 'bad'));
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n, 0);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM SceneChannelsV2').get().n, 0);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM Contexts WHERE guild_id = 'empty'").get().n, 0);
});

test('3B default modifié ne déplace pas l’historique ; inactif lisible mais non mutable', t => {
    const f = fixture(t);
    const one = f.create('a', null, 'one');
    f.contexts.setDefault('a', f.b.id);
    assert.equal(f.create('a', null, 'two').context_id, f.b.id);
    assert.equal(f.manager.getScene(one.id).context_id, f.a.id);
    assert.equal(f.manager.getScene(one.id, { guildId: 'a' }), null);
    assert.equal(f.manager.getScene(one.id, { guildId: 'a', contextId: f.a.id }).id, one.id);
    require('../src/database/schemaSceneContexts')(f.db);
    assert.equal(f.manager.getScene(one.id).context_id, f.a.id);
    f.db.prepare('UPDATE Contexts SET is_active = 0 WHERE id = ?').run(f.a.id);
    assert.equal(f.manager.getScenes('a', f.a.id).length, 1);
    assert.throws(() => f.manager.closeScene(one.id, { guildId: 'a', contextId: f.a.id }));
    assert.equal(f.manager.getScene(one.id).status, 'active');
});

test('3B move et mutations forgés refusés avant modification ; move valide garde Context', t => {
    const f = fixture(t);
    const one = f.create('a', f.a.id, 'one');
    const two = f.create('a', f.b.id, 'two');
    const move = scope => f.manager.moveSceneIfCurrent({
        sceneId: one.id, guildId: 'a', contextId: f.b.id,
        expectedSourceChannelId: 'one', destinationChannelId: 'destination', ...scope
    });
    assert.equal(move({}).moved, false);
    assert.equal(move({ guildId: 'b', contextId: f.c.id }).moved, false);
    assert.throws(() => f.manager.closeScene(one.id, { guildId: 'a', contextId: f.b.id }));
    assert.throws(() => f.manager.restartScene(one.id, 'now', { guildId: 'b', contextId: f.c.id }));
    assert.throws(() => f.manager.recordSceneMessage(one.id, 'now', { guildId: 'a', contextId: f.b.id }));
    assert.equal(move({ contextId: f.a.id, destinationChannelId: 'two' }).reason, 'destination_occupied');
    assert.equal(f.manager.getActiveSceneByChannel('a', 'one', f.a.id).id, one.id);
    assert.equal(move({ contextId: f.a.id }).moved, true);
    assert.equal(f.manager.getScene(one.id).context_id, f.a.id);
    assert.equal(f.manager.getActiveSceneByChannel('a', 'two', f.b.id).id, two.id);
    const count = f.db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n;
    assert.throws(() => f.create('a', f.b.id, 'destination'));
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n, count, 'failed link rolls creation back');
});

test('3B cycles legacy et propositions portent un Context persistant', t => {
    const f = fixture(t);
    const cycle = f.manager.startNewCycle({ guildId: 'a', channelId: 'legacy', contextId: f.b.id });
    assert.equal(cycle.context_id, f.b.id);
    assert.equal(f.manager.getCycle('a', 'legacy', f.a.id), null);
    assert.throws(() => f.manager.recordMessage({ guildId: 'a', channelId: 'legacy', contextId: f.a.id }));
    f.manager.proposeSceneStart({ guildId: 'a', channelId: 'proposal', messageId: 'message', contextId: f.b.id });
    assert.equal(f.manager.getStartProposalByMessage('message').context_id, f.b.id);
});

test('3B GreyFate conserve son Context, valide les frontières et ne crée aucune ScenesV2', t => {
    const f = fixture(t);
    const repository = require('../src/v2/repositories/GreyFateRepository');
    repository.initializeSchema();
    const payload = { eventId: 'event', guildId: 'a' };
    const duo = { duoId: 'duo', threadId: 'thread', maleUserId: 'male', femaleUserId: 'female', maleCharacter: 'A', femaleCharacter: 'B' };
    repository.upsertDuo(payload, duo, 'now');
    const saved = repository.getDuo('duo');
    assert.equal(saved.context_id, f.a.id);
    f.contexts.setDefault('a', f.b.id);
    repository.upsertDuo(payload, duo, 'later');
    assert.equal(repository.getDuo('duo').context_id, f.a.id);
    assert.equal(repository.assertDuoContext(saved).context_id, f.a.id);
    assert.throws(() => repository.upsertDuo(payload, { ...duo, contextId: f.b.id }, 'bad'));
    assert.throws(() => repository.upsertDuo({ ...payload, guildId: 'b' }, duo, 'bad'));
    assert.throws(() => repository.upsertDuo(payload, { ...duo, duoId: 'other', contextId: f.c.id }, 'bad'));
    for (const contextId of ['', 'missing']) assert.throws(() => repository.upsertDuo(payload, { ...duo, duoId: 'other', contextId }, 'bad'));
    assert.throws(() => repository.assertDuoContext({ ...saved, context_id: f.b.id }));
    assert.throws(() => repository.assertDuoContext(saved, { guildId: 'a', contextId: f.b.id }));
    f.db.prepare('UPDATE Contexts SET is_active = 0 WHERE id = ?').run(f.a.id);
    assert.throws(() => repository.assertDuoContext(saved));
    assert.throws(() => repository.upsertDuo(payload, { ...duo, duoId: 'inactive', contextId: f.a.id }, 'bad'));
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n, 0);
});

test('3B cycle legacy et lien direct gardent leurs gardes et écritures dans la même transaction', t => {
    const f = fixture(t);
    const repo = require('../src/v2/repositories/SceneAssistantRepository');
    const original = repo.requireLegacyCycleContext.bind(repo);
    repo.requireLegacyCycleContext = (...args) => {
        assert.equal(f.db.inTransaction, true, 'Context check holds the SQLite write transaction');
        return original(...args);
    };
    const data = { guildId: 'a', channelId: 'legacy', contextId: f.a.id };
    f.manager.startNewCycle(data);
    f.manager.recordMessage(data);
    f.manager.markConclude(data);
    const before = f.manager.getCycle('a', 'legacy', f.a.id);
    for (const method of ['startNewCycle', 'recordMessage', 'markConclude']) {
        assert.throws(() => f.manager[method]({ ...data, contextId: f.b.id }));
        assert.deepEqual(f.manager.getCycle('a', 'legacy', f.a.id), before);
    }
    const scene = f.create('a', f.a.id, 'first');
    f.db.exec("CREATE TRIGGER fail_link BEFORE INSERT ON SceneChannelsV2 BEGIN SELECT RAISE(ABORT, 'forced link failure'); END");
    assert.throws(() => repo.linkChannel({ sceneId: scene.id, guildId: 'a', contextId: f.a.id, channelId: 'first', linkedAt: 'later' }), /forced link failure/);
    assert.equal(f.manager.getActiveSceneByChannel('a', 'first', f.a.id).id, scene.id);
});

test('3B recherche de scène active du personnage limitée au Context, indexes des lectures Staff', t => {
    const f = fixture(t);
    const scene = f.create('a', f.a.id, 'rp');
    f.db.exec("INSERT INTO UsersV2(discord_user_id,created_at,updated_at) VALUES ('player','now','now');");
    const owner = f.db.prepare("SELECT id FROM UsersV2 WHERE discord_user_id = 'player'").get().id;
    f.db.prepare("INSERT INTO CharactersV2(id,owner_user_id,proxy_name,character_type,created_at,updated_at) VALUES ('character',?,'Player','personnage_joue','now','now')").run(owner);
    f.manager.addParticipant(scene.id, 'character', 'now', { guildId: 'a', contextId: f.a.id });
    assert.equal(f.manager.getActiveSceneForCharacter('a', 'character', f.a.id).id, scene.id);
    assert.equal(f.manager.getActiveSceneForCharacter('a', 'character', f.b.id), null);
    const other = f.create('a', f.b.id, 'other');
    assert.equal(f.manager.claimTimelineWarning(scene.id, other.id, 'character'), false);
    const plan = f.db.prepare(`EXPLAIN QUERY PLAN SELECT scene.id, GROUP_CONCAT(link.channel_id)
        FROM ScenesV2 scene LEFT JOIN SceneChannelsV2 link ON link.scene_id = scene.id AND link.unlinked_at IS NULL
        WHERE scene.guild_id = ? AND scene.context_id = ? AND scene.status IN ('active','conclude') GROUP BY scene.id`).all('a', f.a.id);
    assert.ok(plan.some(row => /SEARCH scene .*idx_ScenesV2_context/.test(row.detail)), JSON.stringify(plan));
    assert.ok(plan.some(row => /SEARCH link .*idx_scene_channels_v2_scene_active/.test(row.detail)), JSON.stringify(plan));
    assert.deepEqual(f.db.pragma('foreign_key_check'), []);
});

test('3B deux écritures legacy concurrentes de Contexts différents : un seul gagnant, aucun compteur croisé', async t => {
    const f = fixture(t);
    const { Worker } = require('node:worker_threads');
    const gate = new SharedArrayBuffer(4);
    const workers = [f.a.id, f.b.id].map(contextId => new Worker(`
        const { parentPort, workerData: d } = require('node:worker_threads');
        const db = new (require(d.sqlite))(d.filename, { timeout: 10000 });
        db.pragma('foreign_keys = ON');
        require.cache[d.databaseModule] = { id: d.databaseModule, filename: d.databaseModule, loaded: true, exports: db };
        const repo = require(d.repository);
        parentPort.postMessage({ ready: true });
        Atomics.wait(new Int32Array(d.gate), 0, 0);
        try {
            const row = repo.recordMessage({ guildId: 'a', channelId: 'raced', contextId: d.contextId, occurredAt: 'now' });
            parentPort.postMessage({ winner: row.context_id });
        } catch (error) { parentPort.postMessage({ error: error.message }); }
        finally { db.close(); }
    `, { eval: true, workerData: { gate, contextId, filename: f.db.name,
        sqlite: require.resolve('better-sqlite3'), databaseModule: require.resolve('../src/database/database'),
        repository: require.resolve('../src/v2/repositories/SceneAssistantRepository') } }));
    t.after(async () => { await Promise.all(workers.map(worker => worker.terminate())); });
    let ready = 0;
    const results = await Promise.all(workers.map(worker => new Promise((resolve, reject) => {
        worker.on('error', reject);
        worker.on('exit', code => { if (code) reject(new Error(`worker exit ${code}`)); });
        worker.on('message', value => {
            if (value.ready) {
                if (++ready === 2) { Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0); }
            } else resolve(value);
        });
    })));
    const winners = results.filter(r => r.winner);
    assert.equal(winners.length, 1, JSON.stringify(results));
    assert.match(results.find(r => r.error).error, /autre contexte/);
    const row = f.db.prepare('SELECT * FROM SceneAssistantCyclesV2').get();
    assert.equal(row.context_id, winners[0].winner);
    assert.equal(row.rp_message_count, 1);
    assert.equal(f.db.pragma('integrity_check', { simple: true }), 'ok');
    await Promise.all(workers.map(worker => new Promise(resolve => worker.threadId === -1 ? resolve() : worker.once('exit', resolve))));
});

test('3B GreyFate continuation après ACK perdu/default changé garde clé et Context persistants', async t => {
    const f = fixture(t);
    const repo = require('../src/v2/repositories/GreyFateRepository');
    repo.initializeSchema();
    repo.upsertDuo({ eventId: 'event', guildId: 'a' }, { duoId: 'duo', threadId: 'thread', maleUserId: 'male', femaleUserId: 'female', maleCharacter: 'M', femaleCharacter: 'F' }, 'now');
    repo.markClosurePrompt('duo', '2026-09-07T10:00:00.000Z');
    const saved = repo.getDuo('duo');
    delete require.cache[require.resolve('../src/v2/services/greyfate/GreyFateIntegrationService')];
    const service = require('../src/v2/services/greyfate/GreyFateIntegrationService');
    const keys = [];
    service.sendToFate = async payload => { keys.push(payload.operationKey); throw new Error('ACK perdu'); };
    await assert.rejects(service.continueDuo(saved, 'male', saved.closure_prompt_sent_at), /ACK perdu/);
    f.contexts.setDefault('a', f.b.id);
    delete require.cache[require.resolve('../src/v2/services/greyfate/GreyFateIntegrationService')];
    const restarted = require('../src/v2/services/greyfate/GreyFateIntegrationService');
    restarted.sendToFate = async payload => { keys.push(payload.operationKey); return { duplicate: true }; };
    const result = await restarted.continueDuo(repo.getDuo('duo'), 'male', saved.closure_prompt_sent_at);
    assert.equal(result.completed, true);
    assert.equal(result.duplicate, true);
    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
    assert.equal(repo.getDuo('duo').context_id, f.a.id);
    await assert.rejects(restarted.continueDuo(saved, 'male', saved.closure_prompt_sent_at), /plus active/);
    assert.equal(keys.length, 2);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM GreyFateDuos').get().n, 1);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n, 0);
});

test('3B GreyFate même opération entrante après changement de default ne recrée rien', async t => {
    const f = fixture(t);
    const repo = require('../src/v2/repositories/GreyFateRepository');
    repo.initializeSchema();
    delete require.cache[require.resolve('../src/v2/services/greyfate/GreyFateIntegrationService')];
    const service = require('../src/v2/services/greyfate/GreyFateIntegrationService');
    const payload = { type: 'GREYFATE_EVENT_STARTED', operationKey: 'event:START', eventId: 'event', guildId: 'a',
        duos: [{ duoId: 'duo', threadId: 'thread', maleUserId: 'male', femaleUserId: 'female', maleCharacter: 'M', femaleCharacter: 'F' }] };
    const effects = [];
    service.authenticate = () => true; // In-memory HTTP objects only; no listener or network.
    service.read = async () => payload;
    service.resolveDuoThread = async () => ({ id: 'thread', guildId: 'a' });
    service.sendAsWeaver = async () => { effects.push('welcome'); return { id: 'welcome' }; };
    const receive = async () => {
        const res = { writeHead(code) { this.code = code; }, end(body) { this.body = JSON.parse(body); } };
        await service.handleHttp({ method: 'POST', url: '/integrations/greyfate/events' }, res);
        return res;
    };
    assert.equal((await receive()).code, 200);
    f.contexts.setDefault('a', f.b.id);
    assert.deepEqual((await receive()).body, { ok: true, duplicate: true });
    assert.deepEqual(effects, ['welcome']);
    assert.equal(repo.getDuo('duo').context_id, f.a.id);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM GreyFateOperations').get().n, 1);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM GreyFateDuos').get().n, 1);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n, 0);
});

test('3B inactivité abandonne un snapshot fermé ou déplacé pendant une attente Discord', async t => {
    const f = fixture(t);
    f.manager.configure({ guildId: 'a', durationDays: 8, recommendedMessageCount: 10, inactivityHours: 1 });
    const first = f.create('a', f.a.id, 'first');
    const second = f.create('a', f.b.id, 'second');
    for (const scene of [first, second]) f.manager.recordSceneMessage(scene.id, '2020-01-01T00:00:00.000Z', { guildId: 'a', contextId: scene.context_id });
    const { stubModule } = require('./helpers/moduleStub');
    const effects = [];
    stubModule('src/v2/core/services/DiscordReferenceResolverService.js', {
        resolve: async reference => {
            if (reference.discordId === 'first') f.manager.closeScene(first.id, { guildId: 'a', contextId: f.a.id });
            return { available: true, channel: { id: reference.discordId, isTextBased: () => true, send: async () => effects.push('send') } };
        }
    });
    stubModule('src/v2/core/services/DiscordThreadAccessService.js', {
        ensureWritable: async channel => {
            effects.push('writable');
            f.manager.moveSceneIfCurrent({ sceneId: second.id, guildId: 'a', contextId: f.b.id, expectedSourceChannelId: 'second', destinationChannelId: 'elsewhere' });
            return { ready: true, channel };
        }
    });
    delete require.cache[require.resolve('../src/v2/services/scenes/SceneInactivityService')];
    const service = require('../src/v2/services/scenes/SceneInactivityService');
    service.client = {};
    assert.deepEqual(await service.check(new Date('2026-09-07T12:00:00.000Z')), []);
    assert.deepEqual(effects, ['writable']);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM SceneClosurePromptsV2').get().n, 0);
    assert.equal(f.manager.getScene(second.id).context_id, f.b.id);
});

test('3B move revalide scenes/write après les lectures Discord et avant la transition DB', async t => {
    const f = fixture(t);
    const scene = f.create('a', f.a.id, 'source');
    const { stubModule } = require('./helpers/moduleStub');
    let allowed = true, error;
    f.manager.isSceneParticipantUser = () => false;
    stubModule('src/v2/core/services/StaffPermissionDecisionService.js', { decide: () => ({ allowed }) });
    stubModule('src/v2/core/services/InteractionResponseService.js', {
        deferPrivate: async () => {}, editOrReplyError: async (_i, value) => { error = value; }
    });
    delete require.cache[require.resolve('../src/v2/interactions/scenes/SceneInteractionHandler')];
    const handler = require('../src/v2/interactions/scenes/SceneInteractionHandler');
    await handler.submitMove({ guildId: 'a', channelId: 'source', user: { id: 'staff' },
        channel: { id: 'source', messages: { fetch: async () => { allowed = false; return { find: () => null }; } } },
        client: { user: { id: 'bot' }, channels: { fetch: async () => ({ id: 'target', guildId: 'a', isTextBased: () => true }) } },
        fields: { getTextInputValue: () => '' }
    }, scene.id, 'target', f.a.id);
    assert.match(error, /Seuls un participant/);
    assert.equal(f.manager.getActiveSceneByChannel('a', 'source', f.a.id).id, scene.id);
    assert.equal(f.manager.getActiveSceneByChannel('a', 'target', f.a.id), null);
});

test('3B le suivi automatique garde le Context du lien après changement de défaut', async t => {
    const f = fixture(t);
    const scene = f.create('a', f.a.id, 'rp');
    f.contexts.setDefault('a', f.b.id);
    f.manager.configure({ guildId: 'a', durationDays: 8, recommendedMessageCount: 10 });
    f.manager.addScope({ guildId: 'a', channelId: 'rp', createdBy: 'staff' });
    delete require.cache[require.resolve('../src/v2/services/scenes/SceneAssistantService')];
    const service = require('../src/v2/services/scenes/SceneAssistantService');
    const result = await service.processMessage({ guildId: 'a', channelId: 'rp', channel: { id: 'rp' }, author: { bot: false }, content: 'RP' });
    assert.equal(result.cycle.context_id, f.a.id);
    assert.equal(f.manager.getScene(scene.id).rp_message_count, 1);
    f.db.prepare('UPDATE Contexts SET is_active = 0 WHERE id = ?').run(f.a.id);
    assert.equal(await service.processMessage({ guildId: 'a', channelId: 'rp', channel: { id: 'rp' }, author: { bot: false }, content: 'RP' }), null);
    assert.equal(f.manager.getScene(scene.id).rp_message_count, 1);
});

test('3B page Staff filtrée, Context visible, pagination et limites Discord', t => {
    const f = fixture(t);
    f.create('a', f.a.id, 'unique-a');
    f.create('a', f.b.id, 'unique-b');
    for (let i = 0; i < 26; i++) f.contexts.create({ guildId: 'a', key: `extra-${i}`, name: `Extra ${i}` });
    delete require.cache[require.resolve('../src/v2/pages/staff/StaffScenesPage')];
    const page = require('../src/v2/pages/staff/StaffScenesPage');
    const interaction = { guildId: 'a', user: { id: 'reader' } };
    const payload = page.build(interaction, f.b.id, 1);
    const embed = payload.embeds[0].toJSON();
    assert.match(embed.description, /Child/);
    assert.ok(embed.description.includes(f.b.id));
    assert.ok(JSON.stringify(embed).includes('unique-b'));
    assert.ok(!JSON.stringify(embed).includes('unique-a'));
    assert.equal(payload.components.length, 5);
    for (const row of payload.components) for (const component of row.toJSON().components) {
        assert.ok(component.custom_id.length <= 100);
        if (component.options) assert.ok(component.options.length <= 25);
    }
    const selection = payload.components[3].toJSON().components[0];
    assert.match(selection.placeholder, /2\/2/);
    const draft = require('../src/v2/services/scenes/SceneContextSelectionService')
        .get(selection.custom_id.split(':')[2], 'a', 'reader');
    assert.equal(draft.contextId, f.b.id);
});

test('3B formulaire garde le Context sélectionné et revalide son activité au submit', async t => {
    const f = fixture(t);
    const { stubModule } = require('./helpers/moduleStub');
    let modal, error;
    stubModule('src/v2/core/services/InteractionResponseService.js', { replyError: async (_i, value) => { error = value; } });
    delete require.cache[require.resolve('../src/v2/interactions/scenes/SceneInteractionHandler')];
    delete require.cache[require.resolve('../src/v2/interactions/scenes/SceneScopedInteractionHandler')];
    const handler = require('../src/v2/interactions/scenes/SceneInteractionHandler');
    const interaction = { guildId: 'a', user: { id: 'creator' }, showModal: async value => { modal = value; } };
    await handler.start(interaction, f.b.id);
    const submitted = { ...interaction, customId: modal.toJSON().custom_id, isModalSubmit: () => true };
    const scopes = require('../src/v2/services/scenes/SceneContextInteractionService');
    assert.equal(scopes.read(submitted).contextId, f.b.id);
    f.db.prepare('UPDATE Contexts SET is_active = 0 WHERE id = ?').run(f.b.id);
    await require('../src/v2/interactions/scenes/SceneScopedInteractionHandler')(submitted);
    assert.match(error.message, /inactif/);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ScenesV2').get().n, 0);
});

test('3B reprise filtrée et IDs forgés refusés dans le handler avant defer/fetch', async t => {
    const f = fixture(t);
    const one = f.create('a', f.a.id, 'one');
    const two = f.create('a', f.b.id, 'two');
    const { stubModule } = require('./helpers/moduleStub');
    let payload;
    stubModule('src/v2/core/services/StaffPermissionDecisionService.js', { decide: () => ({ allowed: false }) });
    stubModule('src/v2/core/services/InteractionResponseService.js', {
        replyPrivate: async (_interaction, value) => { payload = value; },
        replyError: async (_interaction, value) => { payload = value; },
        editOrReplyError: async (_interaction, value) => { payload = value; }
    });
    delete require.cache[require.resolve('../src/v2/interactions/scenes/SceneInteractionHandler')];
    const handler = require('../src/v2/interactions/scenes/SceneInteractionHandler');
    f.manager.isSceneParticipantUser = () => false;
    const interaction = { guildId: 'a', channelId: 'destination', user: { id: 'creator' } };
    await handler.resume(interaction, f.a.id);
    const options = payload.components[0].toJSON().components[0].options;
    assert.equal(options.length, 1);
    assert.ok(options[0].value.includes(one.id));
    assert.ok(!options[0].value.includes(two.id));
    await handler.submitMove(interaction, two.id, 'destination', f.a.id);
    assert.match(payload, /introuvable/);
    await handler.selectResume({ ...interaction, values: [`${two.id}|two`] }, f.a.id);
    assert.match(payload, /introuvable/);
    await handler.closeNow(interaction, two.id, f.a.id);
    assert.match(payload, /introuvable/);
    assert.equal(f.manager.getScene(two.id).status, 'active');
});
