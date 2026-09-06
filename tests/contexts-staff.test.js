const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { PermissionFlagsBits } = require('discord.js');
const { stubModule } = require('./helpers/moduleStub');
const Repository = require('../src/v2/repositories/ContextRepository');
const Service = require('../src/v2/services/contexts/ContextService');

function setup(t) {
    const db = new Database(':memory:'); t.after(() => db.close());
    db.exec("CREATE TABLE Guilds(id TEXT PRIMARY KEY); INSERT INTO Guilds VALUES ('a'), ('b');");
    require('../src/database/schemaContexts')(db);
    const contexts = new Service(new Repository(db));
    stubModule('src/v2/services/contexts/index.js', { contexts });
    stubModule('src/v2/core/services/InteractionResponseService.js', {
        replyError: async i => { i.denied = true; }
    });
    const pagePath = require.resolve('../src/v2/pages/staff/StaffContextsPage');
    delete require.cache[pagePath];
    const page = require(pagePath);
    const interaction = (customId, root = true, admin = false) => ({
        customId, guildId: 'a', guild: { ownerId: 'owner' }, user: { id: root ? 'owner' : 'other' },
        memberPermissions: { has: flag => admin ? flag === PermissionFlagsBits.Administrator : flag === PermissionFlagsBits.ManageGuild },
        fields: { getTextInputValue: key => ({ key: 'new', name: 'Nom', description: 'Texte' })[key] },
        update: async function(payload) { this.payload = payload; },
        showModal: async function(value) { this.modal = value; }
    });
    return { db, contexts, page, interaction };
}
test('3A UI roots uniquement, refus avant lecture et effets', async t => {
    const { page, interaction, contexts } = setup(t);
    for (const id of ['v3_context:list:0', 'v3_context:create', 'v3_context:edit:forged',
        'v3_context:default:forged', 'v3_context_submit:new']) {
        const i = interaction(id, false); await page.handle(i);
        assert.equal(i.denied, true); assert.equal(i.payload, undefined); assert.equal(i.modal, undefined);
    }
    assert.deepEqual(contexts.listByGuild('a'), []);
    for (const i of [interaction('v3_context:create'), interaction('v3_context:create', false, true)]) {
        await page.handle(i); assert.ok(i.modal);
    }
});
test('3A UI retrait de droit entre formulaire et submit', async t => {
    const { page, interaction, contexts } = setup(t);
    const i = interaction('v3_context:create'); await page.handle(i); assert.ok(i.modal);
    i.user.id = 'other'; i.customId = 'v3_context_submit:new';
    await page.handle(i); assert.equal(i.denied, true); assert.deepEqual(contexts.listByGuild('a'), []);
});

test('3A UI révocation Admin bloque édition et replay du défaut', async t => {
    const { page, interaction, contexts } = setup(t);
    const first = contexts.create({ guildId: 'a', key: 'first', name: 'First' });
    const second = contexts.create({ guildId: 'a', key: 'second', name: 'Second' });
    const i = interaction(`v3_context:edit:${first.id}`, false, true);
    await page.handle(i); assert.ok(i.modal);
    i.memberPermissions.has = () => false;
    i.customId = `v3_context_submit:${first.id}`;
    await page.handle(i); assert.equal(i.denied, true);
    assert.equal(contexts.required('a', first.id).name, 'First');
    i.customId = `v3_context:default:${second.id}`;
    await page.handle(i);
    assert.equal(contexts.required('a', first.id).is_default, 1);
});
test('3A UI créer, modifier, défaut et accès forgé cross-guild', async t => {
    const { page, interaction, contexts } = setup(t);
    const i = interaction('v3_context_submit:new'); await page.handle(i);
    assert.equal(i.denied, undefined); assert.ok(i.payload);
    const row = contexts.listByGuild('a')[0];
    const second = contexts.create({ guildId: 'a', key: 'second', name: 'Second' });
    await page.handle(interaction(`v3_context:default:${second.id}`));
    assert.equal(contexts.required('a', second.id).is_default, 1);
    const edit = interaction(`v3_context_submit:${row.id}`);
    edit.fields.getTextInputValue = key => key === 'name' ? 'Modifié' : 'Description';
    await page.handle(edit); assert.equal(contexts.required('a', row.id).name, 'Modifié');
    const foreign = contexts.create({ guildId: 'b', key: 'foreign', name: 'Foreign' });
    for (const id of [`v3_context:edit:${foreign.id}`, `v3_context:default:${foreign.id}`, `v3_context_submit:${foreign.id}`]) {
        const forged = interaction(id); await page.handle(forged); assert.equal(forged.denied, true);
    }
    assert.equal(contexts.required('b', foreign.id).name, 'Foreign');
});
test('3A UI navigation bornée et sans backfill lors de consultation', t => {
    const { page, interaction, contexts } = setup(t);
    page.build(interaction('v3_context:list:0'));
    assert.deepEqual(contexts.listByGuild('a'), []);
    for (let n = 0; n < 28; n++) contexts.create({ guildId: 'a', key: `key-${n}`, name: `Nom ${n}` });
    const payload = page.build(interaction('v3_context:list:999'), 999);
    assert.equal(payload.embeds[0].toJSON().footer.text, '28 / 28');
    assert.ok(payload.components.length <= 5);
    assert.equal(payload.components[1].toJSON().components[2].custom_id, 'page:staff:home');
});
