const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("le premier message d’un fil de forum déclenche l’accueil de l’Entité", async () => {
    const sent = [];
    stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
        claimScopedWelcome: () => selection(),
        releaseForumWelcome: () => {},
        chooseForInvocation: () => null
    });
    stubModule("src/webhooks/webhookManager.js", {
        sendWithWebhook: async (channel, payload) => {
            sent.push({ ...payload, threadId: channel.id });
            return {
                webhook: { id: "webhook" },
                webhookMessage: { id: "message" }
            };
        }
    });
    const servicePath = require.resolve("../src/v2/services/entities/NarrativeEntityService");
    delete require.cache[servicePath];
    const service = require(servicePath);
    const handled = await service.processMessage({
        guildId: "guild",
        channelId: "fil-smut",
        author: { bot: false },
        webhookId: null,
        content: "Premier message RP",
        channel: {
            id: "fil-smut",
            guildId: "guild",
            parentId: "forum-smut",
            isThread: () => true
        }
    });

    assert.equal(handled, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].username, "Goddess");
    assert.equal(sent[0].threadId, "fil-smut");
    assert.equal(sent[0].embeds[0].data.description, "Bienvenue dans le Smut.");
});

function selection() {
    return {
        entity: {
            id: "entity",
            name: "Goddess",
            avatar_url: "https://cdn.discordapp.com/goddess.png",
            embed_color: 0xFF00AA
        },
        message: { content: "Bienvenue dans le Smut." }
    };
}
