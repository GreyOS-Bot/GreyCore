const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("le brouillon de diffusion limite les Entités et destinations", () => {
    const drafts = require("../src/v2/services/entities/NarrativeEntityBroadcastDraftService");
    drafts.clear("guild", "staff");
    const draft = drafts.update("guild", "staff", {
        entityIds: Array.from({ length: 8 }, (_, index) => `entity-${index}`),
        channelIds: Array.from({ length: 14 }, (_, index) => `channel-${index}`)
    });

    assert.equal(draft.entityIds.length, 5);
    assert.equal(draft.channelIds.length, 10);
    drafts.clear("guild", "staff");
});

test("la diffusion conserve l’identité de l’Entité et le titre d’un forum", async () => {
    let payload;
    stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
        getById: () => ({
            id: "entity",
            name: "Le Héraut",
            avatar_url: "https://example.com/avatar.png",
            embed_color: 0x123456,
            is_enabled: 1,
            messages: []
        })
    });
    stubModule("src/webhooks/webhookManager.js", {
        getOrCreateWebhook: async () => ({
            send: async value => {
                payload = value;
                return { id: "message" };
            }
        })
    });
    const servicePath = require.resolve("../src/v2/services/entities/NarrativeEntityService");
    delete require.cache[servicePath];
    const service = require(servicePath);

    await service.sendEntity({
        channel: { guildId: "guild", id: "forum", isThread: () => false },
        entityId: "entity",
        content: "Une annonce importante.",
        threadName: "Annonce officielle"
    });

    assert.equal(payload.username, "Le Héraut");
    assert.equal(payload.avatarURL, "https://example.com/avatar.png");
    assert.equal(payload.threadName, "Annonce officielle");
    assert.equal(payload.embeds[0].toJSON().description, "Une annonce importante.");
});
