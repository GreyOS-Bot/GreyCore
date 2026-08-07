const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("le guide staff vérifie les réglages essentiels et signale les options", () => {
    stubModule("src/v2/managers/GuildSettingsV2Manager.js", {
        getValidationChannelId: () => "validation",
        getErrorLogChannelId: () => null
    });
    stubModule("src/v2/managers/GuildModuleV2Manager.js", { getAll: () => [{ module_key: "phone" }] });
    stubModule("src/v2/repositories/RelationshipTypeRepository.js", { getByGuild: () => [{ id: 1 }] });
    stubModule("src/v2/managers/StateTypeV2Manager.js", { getStateTypesByGuild: () => [{ id: 1 }] });
    stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
        getConfiguration: () => ({ is_enabled: 0 }),
        getScopes: () => []
    });
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canManagePermissions: () => true
    });
    const pagePath = require.resolve("../src/v2/pages/staff/StaffSetupPage");
    delete require.cache[pagePath];
    const payload = require(pagePath).build({ guildId: "guild" });
    const description = payload.embeds[0].toJSON().description;
    assert.match(description, /Validation des personnages/);
    assert.match(description, /Journaux de maintenance/);
    assert.match(description, /Assistant de scènes \(facultatif\)/);
    assert.match(description, /Termine les éléments essentiels/);
    const ids = payload.components.flatMap(row => row.toJSON().components.map(item => item.custom_id));
    assert.ok(ids.includes("page:staff:section:settings"));
    assert.ok(ids.includes("page:staff:section:permissions"));
});

test("une page staff refuse un domaine non accordé avant de le charger", async () => {
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canManagePermissions: () => false,
        canAccess: (_interaction, key) => key === "logs"
    });
    const sectionPath = require.resolve("../src/v2/pages/staff/StaffSectionPage");
    delete require.cache[sectionPath];
    const section = require(sectionPath);
    const interaction = { update: async payload => { interaction.payload = payload; } };
    await section.execute(interaction, "characters");
    assert.match(interaction.payload.content, /pas accès/);
});
