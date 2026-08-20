const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("la page staff pagine tous les personnages et affiche leur genre actuel", () => {
    const view = require("../src/v2/views/staff/StaffCharacterGenderView");
    const roster = Array.from({ length: 21 }, (_, index) => character(index));
    const first = view.build(roster, 0);
    const second = view.build(roster, 1);
    const firstSelect = first.components.find(row =>
        row.toJSON().components[0]?.type === 3
    );
    const secondSelect = second.components.find(row =>
        row.toJSON().components[0]?.type === 3
    );

    assert.match(first.embeds[0].toJSON().footer.text, /Page 1\/2 · 21 personnage/);
    assert.equal(firstSelect.toJSON().components[0].options.length, 20);
    assert.match(second.embeds[0].toJSON().footer.text, /Page 2\/2/);
    assert.equal(secondSelect.toJSON().components[0].options.length, 1);

    const choice = view.buildChoice({ ...character(1), gender: "Femme" }, 0);
    const labels = choice.components[0].toJSON().components.map(button => button.label);
    assert.deepEqual(labels, ["Femme", "Homme", "Non genré"]);
});

test("la saisie rapide ouvre le prochain personnage sans genre", () => {
    const view = require("../src/v2/views/staff/StaffCharacterGenderView");
    const roster = [
        { ...character(1), gender: "Femme" },
        character(2),
        character(3)
    ];
    const payload = view.buildQuick(roster, 0);
    const embed = payload.embeds[0].toJSON();
    const ids = payload.components
        .flatMap(row => row.toJSON().components)
        .map(component => component.custom_id);

    assert.match(embed.title, /Personnage 02/);
    assert.ok(ids.every(id => !id?.startsWith("v2_staff_character_gender_set:") || id.endsWith(":quick")));
});

test("le staff enregistre manuellement le genre sur le profil du serveur", async () => {
    const updates = [];
    const roster = [{ ...character(1), id: "character", continuity_id: "continuity" }];
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canManageCharacters: () => true
    });
    stubModule("src/v2/managers/CharacterRosterV2Manager.js", {
        getRoster: () => roster
    });
    stubModule("src/v2/managers/ProfileV2Manager.js", {
        update: (continuityId, data) => {
            updates.push([continuityId, data]);
            roster[0].gender = data.gender;
        }
    });
    const routerPath = require.resolve("../src/v2/router/buttons/StaffRouter");
    delete require.cache[routerPath];
    const router = require(routerPath);
    const interaction = {
        customId: "v2_staff_character_gender_set:character:female:0",
        guildId: "guild",
        isButton: () => true,
        update: async payload => {
            interaction.payload = payload;
        }
    };

    assert.equal(await router(interaction), true);
    assert.deepEqual(updates, [["continuity", { gender: "Femme" }]]);
    assert.match(interaction.payload.embeds[0].toJSON().description, /Femme/);
});

function character(index) {
    return {
        id: `character-${index}`,
        continuity_id: `continuity-${index}`,
        firstname: `Personnage ${String(index).padStart(2, "0")}`,
        proxy_name: `P${index}`,
        discord_user_id: `owner-${index}`,
        character_type: "personnage_joue",
        gender: null,
        is_archived: 0
    };
}
