const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("le centre joueur permet l’oubli avec une double confirmation", async () => {
    const erasedUsers = [];
    stubModule("src/v2/services/privacy/UserPrivacyService.js", {
        getSummary: () => ({}),
        erase: userId => {
            erasedUsers.push(userId);
            return { globalCharacters: 2, legacyCharacters: 1 };
        }
    });
    const routerPath = require.resolve("../src/v2/router/buttons/PlayerRouter");
    delete require.cache[routerPath];
    const router = require(routerPath);

    const interaction = createInteraction("v2_player_privacy_forget");
    assert.equal(await router(interaction), true);
    assert.deepEqual(erasedUsers, []);
    assert.equal(
        getCustomIds(interaction.payload).includes("v2_player_privacy_forget_confirm"),
        true
    );

    const confirmation = createInteraction("v2_player_privacy_forget_confirm");
    assert.equal(await router(confirmation), true);
    assert.deepEqual(erasedUsers, ["player"]);
    assert.match(confirmation.payload.content, /3/);
    assert.deepEqual(confirmation.payload.components, []);
});

function createInteraction(customId) {
    const interaction = {
        customId,
        user: { id: "player" },
        isButton: () => true,
        update: async payload => {
            interaction.payload = payload;
        }
    };
    return interaction;
}

function getCustomIds(payload) {
    return payload.components.flatMap(row =>
        row.toJSON().components.map(component => component.custom_id)
    );
}
