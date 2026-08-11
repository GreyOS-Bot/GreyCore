const test = require("node:test");
const assert = require("node:assert/strict");

test("la page personnages du staff affiche un accès visible à la gestion des genres", () => {
    const rosterManager = require("../src/v2/managers/CharacterRosterV2Manager");
    const validationManager = require("../src/v2/services/validation/ValidationManagerV2");
    const settingsManager = require("../src/v2/managers/GuildSettingsV2Manager");
    const originals = {
        roster: rosterManager.getRoster,
        pending: validationManager.getPendingForGuild,
        validation: settingsManager.getValidationChannelId
    };
    rosterManager.getRoster = () => [];
    validationManager.getPendingForGuild = () => [];
    settingsManager.getValidationChannelId = () => null;

    try {
        const payload = require("../src/v2/pages/staff/StaffCharactersPage").build({ guildId: "guild" });
        const rows = payload.components.map(row => row.toJSON());
        const genderRows = rows.filter(row => row.components.some(
            component => component.custom_id === "v2_staff_characters_genders"
        ));

        assert.equal(genderRows.length, 1);
        assert.equal(genderRows[0].components.length, 1);
        assert.equal(genderRows[0].components[0].label, "Genres des personnages");
    } finally {
        rosterManager.getRoster = originals.roster;
        validationManager.getPendingForGuild = originals.pending;
        settingsManager.getValidationChannelId = originals.validation;
    }
});
