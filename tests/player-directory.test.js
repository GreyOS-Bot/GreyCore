const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("l’annuaire joueur trie, filtre et pagine les personnages validés", () => {
    const view = require("../src/v2/views/player/PlayerDirectoryView");
    const characters = [
        character("Zelda", "owner-z"),
        character("Élise", "owner-e"),
        character("Alba", "owner-a"),
        { ...character("Archive", "owner-x"), is_archived: 1 }
    ];

    const all = view.build(characters);
    const allJson = all.embeds[0].toJSON();
    assert.match(allJson.description, /Alba/);
    assert.match(allJson.description, /Élise/);
    assert.match(allJson.description, /<@owner-z>/);
    assert.doesNotMatch(allJson.description, /Archive/);
    assert.ok(allJson.description.indexOf("Alba") < allJson.description.indexOf("Élise"));

    const letter = view.build(characters, { letter: "e" });
    assert.match(letter.embeds[0].toJSON().description, /Élise/);
    assert.doesNotMatch(letter.embeds[0].toJSON().description, /Alba/);

    const ids = all.components.flatMap(row => row.toJSON().components.map(item => item.custom_id));
    assert.ok(ids.includes("v2_player_directory_letter_am"));
    assert.ok(ids.includes("v2_player_directory_letter_nz"));
});

test("les boutons et menus de l’annuaire rechargent la bonne page", async () => {
    const roster = Array.from({ length: 18 }, (_, index) =>
        character(`Alba ${String(index + 1).padStart(2, "0")}`, `owner-${index}`)
    );
    stubModule("src/v2/managers/CharacterRosterV2Manager.js", {
        getRoster: () => roster
    });

    const buttonPath = require.resolve("../src/v2/router/buttons/PlayerRouter");
    delete require.cache[buttonPath];
    const buttonRouter = require(buttonPath);
    const pageInteraction = interaction("v2_player_directory_page:a:1", "button");
    assert.equal(await buttonRouter(pageInteraction), true);
    assert.match(pageInteraction.payload.embeds[0].toJSON().footer.text, /Page 2\/2/);

    const selectPath = require.resolve("../src/v2/router/selects/PlayerSelectRouter");
    delete require.cache[selectPath];
    const selectRouter = require(selectPath);
    const selectInteraction = interaction("v2_player_directory_letter_am", "select");
    selectInteraction.values = ["a"];
    assert.equal(await selectRouter(selectInteraction), true);
    assert.match(selectInteraction.payload.embeds[0].toJSON().description, /Alba 01/);
});

function character(firstname, owner) {
    return {
        firstname,
        proxy_name: firstname,
        discord_user_id: owner,
        character_type: "personnage_joue",
        is_archived: 0
    };
}

function interaction(customId, type) {
    const value = {
        customId,
        guildId: "guild",
        user: { id: "player" },
        isButton: () => type === "button",
        isStringSelectMenu: () => type === "select",
        update: async payload => {
            value.payload = payload;
        }
    };
    return value;
}
