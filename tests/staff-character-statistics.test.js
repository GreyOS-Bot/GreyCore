const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("les statistiques staff détaillent les types, genres et l’équilibre des PJ", () => {
    const view = require("../src/v2/views/staff/CharacterStatisticsView");
    const text = view.statisticsText([
        character("Alba", "owner-a", "personnage_joue", "Femme"),
        character("Icaro", "owner-i", "personnage_joue", "Masculin"),
        character("Narratrice", "owner-n", "pnj", "féminin"),
        character("Sans genre", "owner-s", "pnj", null),
        { ...character("Archive", "owner-x", "personnage_joue", "Homme"), is_archived: 1 }
    ]);

    assert.match(text, /Total : 4 personnage/);
    assert.match(text, /PJ — 2/);
    assert.match(text, /Femmes : 1 · ♂️ Hommes : 1/);
    assert.match(text, /PNJ — 2/);
    assert.match(text, /Non renseigné : 1/);
    assert.match(text, /Équilibre des PJ : parfait/);
});

test("un genre absent est estimé seulement pour un prénom non ambigu reconnu", () => {
    const view = require("../src/v2/views/staff/CharacterStatisticsView");

    assert.equal(view.genderCategory(null, "Freyja"), "female");
    assert.equal(view.genderCategory(null, "Camille"), "unspecified");
    assert.equal(view.genderCategory(null, "PrénomInconnuDuBot"), "unspecified");
    assert.equal(view.genderCategory("Homme", "Freyja"), "male");
    assert.equal(view.genderCategory("Non binaire", "Freyja"), "unspecified");
});

test("les statistiques alertent le staff dès deux PJ d’écart", () => {
    const view = require("../src/v2/views/staff/CharacterStatisticsView");
    const characters = [
        character("Alba", "owner-a", "personnage_joue", "Femme"),
        character("Kiona", "owner-k", "personnage_joue", "Femme"),
        character("Reya", "owner-r", "personnage_joue", "Femme"),
        character("Icaro", "owner-i", "personnage_joue", "Homme")
    ];
    const text = view.statisticsText(characters);
    const page = view.buildGlobal(characters);
    assert.match(text, /Alerte équilibre des PJ : écart de 2/);
    assert.equal(page.embeds[0].toJSON().color, 0xED4245);
});
test("les PJ masqués restent détaillés sans participer aux statistiques des PJ", () => {
    const view = require("../src/v2/views/staff/CharacterStatisticsView");
    const roster = [
        character("Alba", "owner-a", "personnage_joue", "Femme"),
        character("Story", "owner-a", "pj_masque", "Femme"),
        character("Icaro", "owner-a", "personnage_joue", "Homme"),
        character("Moka", "owner-a", "animal", null)
    ];

    assert.match(view.statisticsText(roster), /Équilibre des PJ : parfait/);
    const page = view.buildUser("owner-a", roster, {
        members: { cache: new Map([["owner-a", { displayName: "Fiona" }]]) }
    });
    const json = page.embeds[0].toJSON();
    const description = json.description;

    assert.match(description, /Utilisateur : \*\*Fiona\*\*/);
    assert.deepEqual(json.fields.map(field => field.name), [
        "♀️ Personnages féminins — 2",
        "♂️ Personnages masculins — 1",
        "⚪ Non renseignés / non genrés — 1"
    ]);
    assert.match(json.fields[0].value, /Alba.*Story/s);
    assert.match(json.fields[1].value, /Icaro/);
    assert.match(json.fields[2].value, /Moka/);
    const componentIds = page.components.flatMap(row => row.toJSON().components.map(component => component.custom_id));
    assert.ok(componentIds.includes("v2_staff_characters_statistics_user"));
});


test("les pseudos Discord récupérés directement remplacent les identifiants", () => {
    const view = require("../src/v2/views/staff/CharacterStatisticsView");
    const names = new Map([["123456789", "Fiona"]]);
    const roster = [character("Reya", "123456789", "personnage_joue", "Femme")];

    const selection = view.buildUserSelection(roster, null, 0, names);
    const option = selection.components[0].toJSON().components[0].options[0];
    assert.equal(option.label, "Fiona");

    const detail = view.buildUser("123456789", roster, null, names).embeds[0].toJSON();
    assert.match(detail.description, /Utilisateur : \*\*Fiona\*\*/);
    assert.match(detail.fields[0].value, /Reya/);
});
test("la sélection staff limite les statistiques au seul utilisateur choisi", async () => {
    const roster = [
        character("Alba", "owner-a", "personnage_joue", "Femme"),
        character("Icaro", "owner-b", "personnage_joue", "Homme"),
        character("Narratrice", "owner-a", "pnj", "Femme")
    ];
    stubModule("src/v2/managers/CharacterRosterV2Manager.js", {
        getRoster: () => roster
    });
    const routerPath = require.resolve("../src/v2/router/selects/StaffSelectRouter");
    delete require.cache[routerPath];
    const router = require(routerPath);
    const interaction = {
        customId: "v2_staff_characters_statistics_user_select",
        guildId: "guild",
        values: ["owner-a"],
        update: async payload => {
            interaction.payload = payload;
        }
    };

    assert.equal(await router(interaction), true);
    const description = interaction.payload.embeds[0].toJSON().description;
    assert.match(description, /<@owner-a>/);
    assert.match(description, /Total : 2 personnage/);
    assert.doesNotMatch(description, /Total : 3 personnage/);
});

test("la sélection des statistiques pagine tous les propriétaires GreyCore", () => {
    const view = require("../src/v2/views/staff/CharacterStatisticsView");
    const roster = Array.from({ length: 27 }, (_, index) => ({
        discord_user_id: `owner-${String(index).padStart(2, "0")}`
    }));
    const first = view.buildUserSelection(roster, null, 0);
    const second = view.buildUserSelection(roster, null, 1);
    const firstMenu = first.components[0].toJSON().components[0];
    const secondMenu = second.components[0].toJSON().components[0];

    assert.equal(firstMenu.options.length, 20);
    assert.equal(secondMenu.options.length, 7);
    assert.match(second.embeds[0].toJSON().description, /27 utilisateur/);
    assert.match(second.embeds[0].toJSON().description, /Page 2\/2/);
});

function character(firstname, owner, type, gender) {
    return {
        id: `character-${firstname}`,
        firstname,
        proxy_name: firstname,
        discord_user_id: owner,
        character_type: type,
        gender,
        is_archived: 0
    };
}
