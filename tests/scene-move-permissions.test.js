const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

function loadHandler({
    scenes = [],
    participantSceneIds = [],
    staffWrite = false
} = {}) {
    let moved = 0;
    let error = null;
    let privatePayload = null;
    const byId = new Map(scenes.map(scene => [scene.id, scene]));

    stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
        getScene: id => byId.get(id) || null,
        getActiveScenes: () => scenes,
        getActiveSceneByChannel: () => null,
        isSceneParticipantUser: sceneId => participantSceneIds.includes(sceneId),
        moveSceneIfCurrent: () => {
            moved += 1;
            return { moved: false, reason: "stale_source" };
        },
        createScene: data => {
            const scene = {
                id: "new-scene",
                guild_id: data.guildId,
                created_by: data.createdBy,
                title: data.title,
                channel_ids: data.channelId
            };
            byId.set(scene.id, scene);
            return scene;
        }
    });
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canAccess: (interaction, key, options) =>
            staffWrite && key === "scenes" && options?.write === true
    });
    stubModule("src/v2/services/scenes/SceneAssistantService.js", {});
    stubModule("src/v2/services/entities/NarrativeEntityService.js", {
        send: async () => null
    });
    stubModule("src/v2/core/services/TechnicalLogger.js", {
        create: () => ({ warn: () => {}, error: () => {} })
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        deferPrivate: async interaction => {
            interaction.deferred = true;
        },
        replyError: async (interaction, message) => {
            error = message;
        },
        editOrReplyError: async (interaction, message) => {
            error = message;
        },
        replyPrivate: async (interaction, payload) => {
            privatePayload = payload;
        }
    });

    const handlerPath = require.resolve(
        "../src/v2/interactions/scenes/SceneInteractionHandler"
    );
    delete require.cache[handlerPath];

    return {
        handler: require(handlerPath),
        moved: () => moved,
        error: () => error,
        privatePayload: () => privatePayload
    };
}

function interaction(userId = "player") {
    return {
        guildId: "guild",
        channelId: "A",
        channel: {
            id: "A",
            guildId: "guild",
            isTextBased: () => true,
            messages: {
                fetch: async () => ({ find: () => null })
            },
            send: async () => null
        },
        user: { id: userId },
        fields: {
            getTextInputValue: id => id === "title" ? "Nouvelle scène" : ""
        },
        values: ["scene|B"],
        client: {
            user: { id: "bot" },
            channels: {
                fetch: async id => ({
                    id,
                    guildId: "guild",
                    isTextBased: () => true,
                    messages: {
                        fetch: async () => ({ find: () => null })
                    },
                    send: async () => null
                })
            }
        },
        editReply: async () => null,
        update: async () => null
    };
}

test("la politique de déplacement accepte participant, créateur et staff scenes write", () => {
    for (const setup of [
        {
            scene: { id: "participant", guild_id: "guild", created_by: "other" },
            participants: ["participant"],
            staff: false
        },
        {
            scene: { id: "creator", guild_id: "guild", created_by: "player" },
            participants: [],
            staff: false
        },
        {
            scene: { id: "staff", guild_id: "guild", created_by: "other" },
            participants: [],
            staff: true
        }
    ]) {
        const fixture = loadHandler({
            scenes: [setup.scene],
            participantSceneIds: setup.participants,
            staffWrite: setup.staff
        });
        assert.equal(
            fixture.handler.canMoveScene(interaction(), setup.scene),
            true
        );
    }
});

test("un ancien participant, un lecteur staff et un autre membre sont refusés", () => {
    const scene = {
        id: "scene",
        guild_id: "guild",
        created_by: "other"
    };
    for (const staffWrite of [false]) {
        const fixture = loadHandler({
            scenes: [scene],
            participantSceneIds: [],
            staffWrite
        });
        assert.equal(
            fixture.handler.canMoveScene(interaction(), scene),
            false
        );
    }
});

test("submitMove forgé est refusé avant mutation et avant toute annonce", async () => {
    const scene = {
        id: "scene",
        guild_id: "guild",
        created_by: "other"
    };
    const fixture = loadHandler({ scenes: [scene] });
    let fetches = 0;
    const forged = interaction();
    forged.client.channels.fetch = async () => {
        fetches += 1;
        return null;
    };

    await fixture.handler.submitMove(forged, "scene", "B");

    assert.equal(fixture.moved(), 0);
    assert.equal(fetches, 0);
    assert.match(fixture.error(), /Seuls un participant/);
});

test("la permission est revérifiée après openMove avant submitMove", async () => {
    const scene = {
        id: "scene",
        guild_id: "guild",
        created_by: "other"
    };
    const participants = ["scene"];
    const fixture = loadHandler({
        scenes: [scene],
        participantSceneIds: participants
    });
    const current = interaction();

    await fixture.handler.openMove(current, "scene");
    assert.ok(fixture.privatePayload());

    participants.length = 0;
    await fixture.handler.submitMove(current, "scene", "B");

    assert.equal(fixture.moved(), 0);
    assert.match(fixture.error(), /Seuls un participant/);
});

test("resume filtre les scènes étrangères mais conserve créateur et participant", async () => {
    const scenes = [
        { id: "foreign", guild_id: "guild", created_by: "other", channel_ids: "B", title: "Étrangère", rp_message_count: 1 },
        { id: "owned", guild_id: "guild", created_by: "player", channel_ids: "C", title: "Créée", rp_message_count: 2 },
        { id: "joined", guild_id: "guild", created_by: "other", channel_ids: "D", title: "Participée", rp_message_count: 3 }
    ];
    const fixture = loadHandler({
        scenes,
        participantSceneIds: ["joined"]
    });

    await fixture.handler.resume(interaction());

    const options = fixture.privatePayload().components[0].toJSON().components[0].options;
    assert.deepEqual(
        options.map(option => option.value.split("|")[0]),
        ["owned", "joined"]
    );
});

test("selectResume forgé est refusé, tandis que créateur et staff atteignent la mutation", async () => {
    const scene = {
        id: "scene",
        guild_id: "guild",
        created_by: "other",
        channel_ids: "B",
        title: "Scène"
    };

    const denied = loadHandler({ scenes: [scene] });
    await denied.handler.selectResume(interaction());
    assert.equal(denied.moved(), 0);
    assert.match(denied.error(), /Seuls un participant/);

    const creatorScene = { ...scene, created_by: "player" };
    const creator = loadHandler({ scenes: [creatorScene] });
    await creator.handler.selectResume(interaction());
    assert.equal(creator.moved(), 1);

    const staff = loadHandler({ scenes: [scene], staffWrite: true });
    await staff.handler.selectResume(interaction());
    assert.equal(staff.moved(), 1);
});

test("une nouvelle continuité reste ouverte mais valide la destination avant création", async () => {
    const fixture = loadHandler();
    const invalid = interaction();
    invalid.client.channels.fetch = async () => null;

    await fixture.handler.submitNewMove(invalid, "B");
    assert.equal(fixture.moved(), 0);
    assert.match(fixture.error(), /destination est inaccessible/);

    const valid = loadHandler();
    await valid.handler.submitNewMove(interaction(), "B");
    assert.equal(valid.moved(), 1);
});
