const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("l’espace joueur affiche la scène du salon et les scènes actives", async () => {
    stubModule("src/v2/services/scenes/SceneAssistantService.js", {
        getStatus: () => ({
            kind: "tracked",
            scene: {
                id: "scene-current",
                title: "Soirée au Steel",
                status: "active",
                rp_message_count: 42
            },
            evaluation: {
                durationDays: 8,
                elapsedDays: 3,
                recommendedMessageCount: 100
            }
        })
    });
    stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
        getActiveScenes: () => [{
            id: "scene-current",
            title: "Soirée au Steel",
            status: "active",
            rp_message_count: 42,
            channel_ids: "channel"
        }]
    });

    const routerPath = require.resolve("../src/v2/router/buttons/PlayerRouter");
    delete require.cache[routerPath];
    const router = require(routerPath);
    const interaction = createInteraction();

    assert.equal(await router(interaction), true);
    const description = interaction.payload.embeds[0].toJSON().description;
    assert.match(description, /Soirée au Steel/);
    assert.match(description, /42 \/ 100/);
    assert.match(description, /<#channel>/);
    assert.ok(customIds(interaction.payload).includes("v2_scene_move:scene-current"));
    assert.ok(customIds(interaction.payload).includes("v2_scene_close_now:scene-current"));
});

test("un salon suivi sans scène propose de commencer ou reprendre", () => {
    const view = require("../src/v2/views/player/PlayerScenesView").build({
        kind: "not_started"
    });
    const ids = customIds(view);
    assert.ok(ids.includes("v2_scene_start"));
    assert.ok(ids.includes("v2_scene_resume"));
    assert.ok(ids.includes("v2_library_home"));
});

function createInteraction() {
    const interaction = {
        customId: "v2_player_scenes",
        guildId: "guild",
        channel: { id: "channel" },
        isButton: () => true,
        update: async payload => {
            interaction.payload = payload;
        }
    };
    return interaction;
}

function customIds(payload) {
    return payload.components.flatMap(row =>
        row.toJSON().components.map(component => component.custom_id)
    );
}
