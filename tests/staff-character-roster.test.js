const test = require("node:test");
const assert = require("node:assert/strict");

test("la liste staff permet de gérer tous les personnages même sans membre Discord", () => {
    const view = require("../src/v2/views/staff/StaffCharacterRosterView");
    const roster = Array.from({ length: 22 }, (_, index) => ({
        id: `character-${index}`,
        firstname: index === 21 ? "Zéphyr orphelin" : `Personnage ${index}`,
        proxy_name: `P${index}`,
        discord_user_id: index === 21 ? "123456789012345678" : `owner-${index}`,
        character_type: "personnage_joue",
        is_archived: 0
    }));

    const first = view.build(roster, 0);
    const second = view.build(roster, 1);
    const secondMenu = second.components[0].toJSON().components[0];

    assert.match(first.embeds[0].toJSON().footer.text, /Page 1\/2/);
    assert.match(second.embeds[0].toJSON().footer.text, /Page 2\/2/);
    assert.ok(secondMenu.options.some(option => option.value === "character-21"));
    assert.ok(secondMenu.options.some(option => option.description.includes("123456789012345678")));
});
