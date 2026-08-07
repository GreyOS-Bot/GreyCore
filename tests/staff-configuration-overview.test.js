const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("la vue configuration indique ce qui est actif et où", () => {
    stubModule("src/v2/managers/GuildSettingsV2Manager.js", {
        getValidationChannelId: () => "validation",
        getErrorLogChannelId: () => "logs",
        getMaintenance: () => ({ enabled: false }),
        getPlayedCharacterCreationLimit: () => ({ enabled: true, limitCount: 2, windowDays: 7 })
    });
    stubModule("src/v2/managers/GuildModuleV2Manager.js", {
        getConfiguration: () => [
            { label: "Téléphone", emoji: "📱", isEnabled: true },
            { label: "Biens", emoji: "🎒", isEnabled: false }
        ]
    });
    stubModule("src/v2/managers/StaffPermissionV2Manager.js", {
        getAssignments: () => ({ roles: [{ role_id: "role" }], users: [{ discord_user_id: "user" }] }),
        getValidationChannelAccess: () => true
    });
    stubModule("src/v2/managers/CharacterApprovalAutomationV2Manager.js", {
        getConfiguration: () => ({ is_enabled: 1, approved_character_count: 2, required_role_id: "new", remove_role_id: "new", add_role_id: "member", welcome_channel_id: "welcome" })
    });
    stubModule("src/v2/repositories/RelationshipTypeRepository.js", { getByGuild: () => [{ id: 1 }] });
    stubModule("src/v2/managers/StateTypeV2Manager.js", { getStateTypesByGuild: () => [{ id: 1 }] });
    stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
        getConfiguration: () => ({ is_enabled: 1, duration_days: 8, recommended_message_count: 100, inactivity_hours: 48 }),
        getScopes: () => [{ channel_id: "rp" }],
        getTriggerExpressions: () => [{ expression: "Rattrapage ?" }]
    });
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canManagePermissions: () => true
    });

    const pagePath = require.resolve("../src/v2/pages/staff/StaffConfigurationOverviewPage");
    delete require.cache[pagePath];
    const embed = require(pagePath).build({ guildId: "guild" }).embeds[0].toJSON();
    const text = embed.fields.map(field => `${field.name}\n${field.value}`).join("\n");
    assert.match(text, /<#validation>/);
    assert.match(text, /<#logs>/);
    assert.match(text, /Téléphone/);
    assert.match(text, /Biens/);
    assert.match(text, /<#rp>/);
    assert.match(text, /<@&role>/);
    assert.match(text, /<@user>/);
    assert.match(text, /2 tous les 7 jours/);
});
