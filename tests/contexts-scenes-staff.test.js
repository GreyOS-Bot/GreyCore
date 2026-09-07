const test = require('node:test');
const assert = require('node:assert/strict');
const { stubModule } = require('./helpers/moduleStub');
const drafts = require('../src/v2/services/scenes/SceneContextSelectionService');

test('3B IDs publics compacts gardent Guild/Context et drafts privés ne changent pas de Context', () => {
    const scopes = require('../src/v2/services/scenes/SceneContextInteractionService');
    const scene = { id: 'scenev2_aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', context_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' };
    const id = scopes.sceneId('v2_scene_close_cancel', scene);
    assert.ok(id.length <= 100);
    assert.deepEqual(scopes.parseScene(id), { sceneId: scene.id, contextId: scene.context_id });
    const interaction = { guildId: 'a', user: { id: 'u' } };
    const customId = scopes.issue(interaction, { action: 'move', contextId: scene.context_id }, 10);
    const submitted = { ...interaction, customId };
    assert.equal(scopes.read(submitted, 11).contextId, scene.context_id);
    assert.equal(scopes.read({ ...submitted, guildId: 'b' }, 11), null);
    assert.equal(scopes.read({ ...submitted, user: { id: 'other' } }, 11), null);
    assert.equal(scopes.read(submitted, 600011), null);
});

test('3B sélection Staff liée à Guild/utilisateur/expiration, sans état courant global', () => {
    const token = drafts.create({ guildId: 'a', userId: 'u', contextId: 'c' }, 100);
    assert.equal(drafts.get(token, 'a', 'u', 101).contextId, 'c');
    assert.equal(drafts.get(token, 'b', 'u', 101), null);
    assert.equal(drafts.get(token, 'a', 'other', 101), null);
    assert.equal(drafts.get(token, 'a', 'u', 600101), null);
    assert.equal(drafts.get('forged', 'a', 'u', 101), null);
});

test('3B Staff scenes/read sélectionne ; write revalidé avant cycle ; aucun droit Context admin', async () => {
    const effects = [];
    let read = true, write = false;
    stubModule('src/v2/core/services/StaffPermissionDecisionService.js', {
        decide: request => { assert.equal(request.permission, 'scenes'); return { allowed: request.write ? write : read }; }
    });
    stubModule('src/v2/managers/SceneAssistantV2Manager.js', {
        resolveContext: (guildId, id) => { if (guildId !== 'a' || !['a1', 'a2'].includes(id)) throw new Error('invalid'); effects.push('resolve'); }
    });
    stubModule('src/v2/pages/staff/StaffScenesPage.js', { build: (_i, id) => ({ context: id }) });
    stubModule('src/v2/services/scenes/SceneAssistantService.js', { startNewCycle: data => effects.push(['cycle', data.contextId]) });
    stubModule('src/v2/core/services/InteractionResponseService.js', { replyError: async () => effects.push('deny') });
    delete require.cache[require.resolve('../src/v2/interactions/scenes/StaffSceneContextHandler')];
    const handler = require('../src/v2/interactions/scenes/StaffSceneContextHandler');
    const token = drafts.create({ guildId: 'a', userId: 'u', contextId: 'a2' });
    const interaction = action => ({
        customId: `v3_staff_scene:${action}:${token}`, guildId: 'a', user: { id: 'u' }, values: ['a1'],
        isButton: () => action !== 'select', isStringSelectMenu: () => action === 'select',
        update: async value => effects.push(['update', value.context])
    });
    await handler(interaction('select'));
    assert.deepEqual(effects.splice(0), ['resolve', ['update', 'a1']]);
    await handler(interaction('cycle'));
    assert.deepEqual(effects.splice(0), ['deny']);
    write = true;
    await handler(interaction('cycle'));
    assert.deepEqual(effects.splice(0), ['resolve', ['cycle', 'a2'], ['update', 'a2']]);
    await handler(interaction('cycle'));
    assert.deepEqual(effects.splice(0), ['deny'], 'consumed write token cannot reset the cycle again');
    write = false;
    await handler(interaction('cycle'));
    assert.deepEqual(effects.splice(0), ['deny']);
    await handler({ ...interaction('select'), values: ['foreign-context'] });
    assert.deepEqual(effects.splice(0), ['deny']);
    await handler({ ...interaction('select'), user: { id: 'other' } });
    assert.deepEqual(effects.splice(0), ['deny']);
    read = false;
    await handler(interaction('select'));
    assert.deepEqual(effects.splice(0), ['deny']);
});

test('3B drafts bornés par acteur et globalement, consommation atomique sans vol inter-user', () => {
    const store = drafts.createStore();
    const own = [];
    const other = store.create({ guildId: 'g', userId: 'other', contextId: 'b' }, 100);
    for (let i = 0; i < 33; i++) own.push(store.create({ guildId: 'g', userId: 'u', contextId: `c${i}` }, 100));
    assert.equal(store.get(own[0], 'g', 'u', 101), null);
    assert.equal(store.get(own[1], 'g', 'u', 101).contextId, 'c1');
    assert.ok(store.get(other, 'g', 'other', 101));
    assert.equal(store.take(own[1], 'g', 'thief', 101), null);
    assert.ok(store.take(own[1], 'g', 'u', 101));
    assert.equal(store.take(own[1], 'g', 'u', 101), null);
    const global = drafts.createStore();
    const first = global.create({ guildId: 'g', userId: 'first', contextId: 'a' }, 100);
    let last;
    for (let i = 0; i < 4096; i++) last = global.create({ guildId: `g${i}`, userId: 'u', contextId: 'a' }, 100);
    assert.equal(global.get(first, 'g', 'first', 101), null);
    assert.ok(global.get(last, 'g4095', 'u', 101));
});

test('3B token privé lié au salon, borné et consommé avant un handler asynchrone', async () => {
    const scopes = require('../src/v2/services/scenes/SceneContextInteractionService');
    const interaction = { guildId: 'g', user: { id: 'u' }, channelId: 'channel', isModalSubmit: () => true };
    const tokens = Array.from({ length: 33 }, () => scopes.issue(interaction, { action: 'start', contextId: 'c' }));
    assert.equal(scopes.read({ ...interaction, customId: tokens[0] }), null);
    const submitted = { ...interaction, customId: tokens.at(-1) };
    assert.equal(scopes.read({ ...submitted, channelId: 'elsewhere' }), null);
    const effects = [];
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    stubModule('src/v2/managers/SceneAssistantV2Manager.js', { resolveContext: () => ({ id: 'c' }) });
    stubModule('src/v2/interactions/scenes/SceneInteractionHandler.js', { submitStart: async () => { effects.push('start'); await gate; } });
    stubModule('src/v2/core/services/InteractionResponseService.js', { replyError: async () => effects.push('deny') });
    delete require.cache[require.resolve('../src/v2/interactions/scenes/SceneScopedInteractionHandler')];
    const handler = require('../src/v2/interactions/scenes/SceneScopedInteractionHandler');
    const first = handler(submitted);
    await handler(submitted);
    release();
    await first;
    assert.deepEqual(effects, ['start', 'deny']);
});
