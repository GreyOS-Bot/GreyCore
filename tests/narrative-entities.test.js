const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

test("les Entités sont isolées par serveur et choisissent un message par déclencheur", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, ?), (?, ?, ?)
    `).run("guild-a", "Greyline", "2026-08-07", "guild-b", "Autre", "2026-08-07");

    for (const modulePath of [
        "../src/v2/repositories/NarrativeEntityRepository",
        "../src/v2/managers/NarrativeEntityV2Manager"
    ]) delete require.cache[require.resolve(modulePath)];

    const manager = require("../src/v2/managers/NarrativeEntityV2Manager");
    const entity = manager.create({
        guildId: "guild-a",
        createdBy: "staff",
        name: "Le Gardien",
        avatarUrl: "https://example.com/gardien.png",
        color: "#123456",
        description: "Narrateur des scènes",
        messagesText: "Un chapitre commence.\nLe destin se met en marche.",
        triggers: ["scene_created"]
    });

    assert.equal(entity.messages.length, 2);
    assert.deepEqual(entity.triggers, ["scene_created"]);
    assert.equal(manager.getByGuild("guild-b").length, 0);

    const selection = manager.chooseForTrigger("guild-a", "scene_created", () => 0);
    assert.equal(selection.entity.name, "Le Gardien");
    assert.equal(selection.message.content, "Un chapitre commence.");
    assert.equal(manager.chooseForTrigger("guild-a", "death", () => 0), null);
});

test("une Entité peut être désactivée, modifiée puis supprimée", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES ('guild', 'Greyline', '2026-08-07')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/NarrativeEntityRepository",
        "../src/v2/managers/NarrativeEntityV2Manager"
    ]) delete require.cache[require.resolve(modulePath)];
    const manager = require("../src/v2/managers/NarrativeEntityV2Manager");
    let entity = manager.create({
        guildId: "guild", name: "Narrateur", color: "#5865F2",
        messagesText: "Bonjour", triggers: []
    });
    entity = manager.setTriggers("guild", entity.id, ["marriage", "birth"]);
    assert.equal(entity.triggers.length, 2);
    entity = manager.toggle("guild", entity.id);
    assert.equal(entity.is_enabled, false);
    entity = manager.update({
        guildId: "guild", entityId: entity.id, name: "Le Destin",
        color: "#abcdef", messagesText: "Nouveau message"
    });
    assert.equal(entity.name, "Le Destin");
    assert.equal(entity.messages[0].content, "Nouveau message");
    assert.equal(manager.delete("guild", entity.id), true);
    assert.equal(manager.getByGuild("guild").length, 0);
});

test("une Entité limitée à un forum intervient aussi dans ses fils", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES ('guild', 'Greyline', '2026-08-08')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/NarrativeEntityRepository",
        "../src/v2/managers/NarrativeEntityV2Manager"
    ]) delete require.cache[require.resolve(modulePath)];
    const manager = require("../src/v2/managers/NarrativeEntityV2Manager");
    let entity = manager.create({
        guildId: "guild",
        name: "Le Dieu du Smut",
        messagesText: "Les portes se referment.",
        triggers: ["scene_nsfw"]
    });
    entity = manager.setScopes("guild", entity.id, ["forum-smut"]);

    assert.deepEqual(entity.scopes, ["forum-smut"]);
    assert.equal(
        manager.chooseForTrigger("guild", "scene_nsfw", {
            channelId: "thread-rp",
            parentId: "forum-smut",
            random: () => 0
        }).entity.id,
        entity.id
    );
    assert.equal(
        manager.chooseForTrigger("guild", "scene_nsfw", {
            channelId: "salon-general",
            random: () => 0
        }),
        null
    );
});
