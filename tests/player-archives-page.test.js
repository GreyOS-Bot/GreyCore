const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("les archives proposent une restauration protégée", () => {
    const view = require("../src/v2/views/player/PlayerArchivesView");
    const character = {
        id: "character",
        display_name: "Story",
        proxy_name: "Sto",
        continuity_count: 2,
        installation_count: 1,
        is_archived: 1
    };
    const list = view.build([character]);
    const ids = customIds(list);
    assert.ok(ids.includes("v2_player_archives_select"));
    assert.match(list.embeds[0].toJSON().description, /Story/);

    const confirmation = view.buildRestoreConfirmation(character);
    assert.ok(customIds(confirmation).includes("v2_player_archive_restore:character"));
    assert.match(confirmation.embeds[0].toJSON().description, /Story/);
});

test("le propriétaire peut archiver puis restaurer sans supprimer les données", async () => {
    const changes = [];
    const character = { id: "character", proxy_name: "Story", owner_user_id: 1, is_archived: 0 };
    const v2 = {
        managers: {
            character: {
                getById: () => character,
                setArchived: (id, archived) => changes.push([id, archived])
            },
            user: { getOrCreate: () => ({ id: 1 }) },
            library: {
                getCharacterForUser: () => ({ ...character, is_archived: 1 }),
                getArchivedCharacters: () => []
            }
        }
    };
    stubModule("src/v2/index.js", v2);
    stubModule("src/v2/core/policies/CharacterManagementPolicy.js", {
        isOwner: () => true
    });

    const characterRouterPath = require.resolve("../src/v2/router/buttons/CharacterRouter");
    delete require.cache[characterRouterPath];
    const characterRouter = require(characterRouterPath);
    const archive = interaction("v2_character_archive_confirm:character");
    assert.equal(await characterRouter(archive), true);
    assert.deepEqual(changes, [["character", true]]);

    const playerRouterPath = require.resolve("../src/v2/router/buttons/PlayerRouter");
    delete require.cache[playerRouterPath];
    const playerRouter = require(playerRouterPath);
    const restore = interaction("v2_player_archive_restore:character");
    assert.equal(await playerRouter(restore), true);
    assert.deepEqual(changes, [["character", true], ["character", false]]);
});

function customIds(payload) {
    return payload.components.flatMap(row =>
        row.toJSON().components.map(component => component.custom_id)
    );
}

function interaction(customId) {
    const value = {
        customId,
        guildId: "guild",
        user: { id: "player" },
        isButton: () => true,
        update: async payload => { value.payload = payload; }
    };
    return value;
}
