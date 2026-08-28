const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

function loadFixture(resolution) {
    const duos = new Map();
    const errors = [];
    let webhooks = 0;
    stubModule("src/v2/repositories/GreyFateRepository.js", {
        initializeSchema: () => {}, upsertEvent: () => {},
        upsertDuo: (payload, duo) => duos.set(duo.duoId, {
            duo_id: duo.duoId, thread_id: duo.threadId, guild_id: payload.guildId,
            welcome_sent_at: null, closure_prompt_sent_at: null, closed_at: null
        }),
        getDuo: id => duos.get(id),
        markWelcome: id => { duos.get(id).welcome_sent_at = "now"; },
        markClosurePrompt: id => { duos.get(id).closure_prompt_sent_at = "now"; },
        markError: (id, message) => errors.push([id, message]),
        getLatestEvent: () => null
    });
    stubModule("src/v2/core/services/DiscordReferenceResolverService.js", {
        resolve: async reference => resolution(reference),
        errorFor: result => Object.assign(new Error("référence Discord indisponible"), {
            result
        })
    });
    stubModule("src/v2/managers/NarrativeEntityV2Manager.js", { getByGuild: () => [{ name: "The Weaver of Fate", is_enabled: 1, embed_color: "#000000" }] });
    stubModule("src/v2/core/services/DiscordThreadAccessService.js", { ensureWritable: async channel => ({ ready: true, channel }) });
    stubModule("src/webhooks/webhookManager.js", { sendWithWebhook: async () => { webhooks += 1; return { webhookMessage: { id: "message" } }; } });
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ info: () => {}, error: () => {} }) });
    delete require.cache[require.resolve("../src/v2/services/greyfate/GreyFateIntegrationService")];
    return {
        service: require("../src/v2/services/greyfate/GreyFateIntegrationService"),
        duos, errors,
        webhookCount: () => webhooks
    };
}

test("GreyFate n'effectue aucun webhook lorsque la santé diffère le contrôle", async () => {
    const f = loadFixture(async () => ({ checked: false, available: false }));
    const state = { externalEffectAttempted: false };
    await assert.rejects(f.service.eventStarted({
        eventId: "event", guildId: "guild",
        duos: [{ duoId: "duo", threadId: "thread", maleCharacter: "A", femaleCharacter: "B" }]
    }, state), /Accueil incomplet/);
    assert.equal(f.webhookCount(), 0);
    assert.equal(state.externalEffectAttempted, false);
    assert.equal(f.duos.get("duo").thread_id, "thread");
    assert.equal(f.errors.length, 1);
});

test("GreyFate reprend l'envoi normal lorsque la référence est résolue", async () => {
    const channel = { id: "thread", guildId: "guild" };
    const f = loadFixture(async () => ({ checked: true, available: true, channel }));
    const state = { externalEffectAttempted: false };
    await f.service.eventStarted({
        eventId: "event", guildId: "guild",
        duos: [{ duoId: "duo", threadId: "thread", maleCharacter: "A", femaleCharacter: "B" }]
    }, state);
    assert.equal(f.webhookCount(), 1);
    assert.equal(f.duos.get("duo").welcome_sent_at, "now");
    assert.equal(f.duos.get("duo").thread_id, "thread");
});
