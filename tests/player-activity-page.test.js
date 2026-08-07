const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("les notifications regroupent relations, corrections et installations", async () => {
    stubModule("src/v2/services/player/PlayerActivityService.js", {
        getActivity: (guildId, userId) => {
            assert.equal(guildId, "guild");
            assert.equal(userId, "player");
            return {
                relationships: [{ id: 7, source_name: "Alba", target_name: "Reya", label_a_to_b: "Sœur" }],
                corrections: [{ character_name: "Reya", reason: "Corriger l’alias." }],
                installations: [{ character_name: "Reya", status: "pending" }]
            };
        }
    });
    const routerPath = require.resolve("../src/v2/router/buttons/PlayerRouter");
    delete require.cache[routerPath];
    const router = require(routerPath);
    const interaction = {
        customId: "v2_player_activity",
        guildId: "guild",
        user: { id: "player" },
        isButton: () => true,
        update: async payload => { interaction.payload = payload; }
    };

    assert.equal(await router(interaction), true);
    const description = interaction.payload.embeds[0].toJSON().description;
    assert.match(description, /Alba/);
    assert.match(description, /Corriger l’alias/);
    assert.match(description, /En attente du staff/);
    const ids = interaction.payload.components.flatMap(row =>
        row.toJSON().components.map(component => component.custom_id)
    );
    assert.ok(ids.includes("v2_relationship_request_accept:7"));
    assert.ok(ids.includes("v2_relationship_request_reject:7"));
});
