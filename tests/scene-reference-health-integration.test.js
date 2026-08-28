const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("une reprise explicite déplace la scène malgré une ancienne référence disparue", async () => {
    const moves = [];
    const sends = [];
    const resolutions = [];
    stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
        getScene: () => ({ id: "scene", guild_id: "guild", title: "Scène", created_by: "player" }),
        isSceneParticipantUser: () => true,
        moveSceneIfCurrent: data => {
            moves.push(data);
            return { moved: true };
        }
    });
    stubModule("src/v2/core/services/DiscordReferenceResolverService.js", {
        resolve: async (reference, context, options) => {
            resolutions.push({ reference, options });
            return { checked: true, available: false, diagnostic: { status: "unknown_channel" } };
        }
    });
    stubModule("src/v2/core/services/DiscordThreadAccessService.js", {
        ensureWritable: async channel => ({ ready: true, channel })
    });
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", { canAccess: () => false });
    stubModule("src/v2/services/scenes/SceneAssistantService.js", {});
    stubModule("src/v2/services/entities/NarrativeEntityService.js", { send: async () => null });
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ error: () => {}, warn: () => {} }) });
    stubModule("src/v2/core/services/InteractionResponseService.js", { replyError: async () => { throw new Error("échec inattendu"); } });
    delete require.cache[require.resolve("../src/v2/interactions/scenes/SceneInteractionHandler")];
    const handler = require("../src/v2/interactions/scenes/SceneInteractionHandler");
    const interaction = {
        values: ["scene|old-channel"], guildId: "guild", channelId: "new-channel",
        channel: { id: "new-channel", guildId: "guild", isTextBased: () => true, send: async payload => { sends.push(payload); } },
        client: { user: { id: "bot" }, channels: { fetch: async () => { throw new Error("fetch direct interdit"); } } },
        user: { id: "player" },
        update: async payload => payload
    };

    await handler.selectResume(interaction);

    assert.equal(resolutions.length, 1);
    assert.equal(resolutions[0].options.force, true, "une action utilisateur contourne le cooldown");
    assert.equal(moves.length, 1);
    assert.equal(moves[0].expectedSourceChannelId, "old-channel");
    assert.equal(moves[0].destinationChannelId, "new-channel");
    assert.equal(sends.length, 1, "l'annonce destination reste indépendante de la source");
});
