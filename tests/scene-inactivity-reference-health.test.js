const test = require("node:test");
const assert = require("node:assert/strict");
const { ChannelType } = require("discord.js");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");
const { stubModule } = require("./helpers/moduleStub");

function loadService(fetch) {
    const isolated = createIsolatedDatabase();
    require("../src/database/schemaV2DiscordReferenceHealth")();
    const saved = [];
    stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
        getInactiveScenes: () => [{ id: "scene", guild_id: "guild", channel_id: "channel", inactivity_hours: 48, status: "active" }],
        saveClosurePrompt: data => saved.push(data)
    });
    stubModule("src/v2/services/scenes/SceneAssistantService.js", { buildClosurePrompt: () => ({ content: "Fermer ?" }) });
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ warn: () => {}, error: () => {} }) });
    for (const path of [
        "../src/v2/repositories/DiscordReferenceHealthRepository",
        "../src/v2/core/services/DiscordReferenceHealthService",
        "../src/v2/core/services/DiscordChannelDiagnosticService",
        "../src/v2/core/services/DiscordReferenceResolverService",
        "../src/v2/core/services/DiscordThreadAccessService",
        "../src/v2/services/scenes/SceneInactivityService"
    ]) delete require.cache[require.resolve(path)];
    const service = require("../src/v2/services/scenes/SceneInactivityService");
    service.client = { channels: { fetch } };
    return { isolated, service, saved };
}

test("le balayage scène temporise une référence absente sans modifier la scène", async context => {
    let fetches = 0;
    const f = loadService(async () => {
        fetches += 1;
        const error = new Error("Unknown Channel");
        error.code = 10003;
        throw error;
    });
    context.after(() => f.isolated.cleanup());
    assert.deepEqual(await f.service.check(new Date("2026-08-28T10:00:00Z")), []);
    assert.deepEqual(await f.service.check(new Date("2026-08-28T10:01:00Z")), []);
    assert.equal(fetches, 1);
    assert.equal(f.saved.length, 0);
    assert.equal(f.isolated.database.prepare("SELECT status FROM DiscordReferenceHealth").get().status, "unknown_channel");
    await f.service.check(new Date("2026-08-28T16:00:00Z"));
    assert.equal(fetches, 2);
});

test("le balayage marque résolue une référence saine puis poursuit le workflow", async context => {
    const sends = [];
    const channel = {
        id: "channel", guildId: "guild", type: ChannelType.GuildText,
        isTextBased: () => true, isThread: () => false,
        send: async payload => { sends.push(payload); return { id: "message" }; }
    };
    const f = loadService(async () => channel);
    context.after(() => f.isolated.cleanup());
    assert.deepEqual(await f.service.check(new Date("2026-08-28T10:00:00Z")), ["scene"]);
    assert.equal(sends.length, 1);
    assert.equal(f.saved.length, 1);
    assert.equal(f.isolated.database.prepare("SELECT status FROM DiscordReferenceHealth").get().status, "resolved");
});
