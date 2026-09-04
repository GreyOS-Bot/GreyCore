const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("les paramètres staff ouvrent la politique et la charte sans ancienne commande", () => {
    stubModule("src/v2/managers/GuildSettingsV2Manager.js", {
        getValidationChannelId: () => "validation",
        getMaintenance: () => ({ enabled: false, message: "Maintenance" })
    });
    const pagePath = require.resolve("../src/v2/pages/staff/StaffSettingsPage");
    delete require.cache[pagePath];
    const page = require(pagePath);
    const payload = page.build({ guildId: "guild" });
    const ids = customIds(payload);
    assert.ok(ids.includes("v2_staff_settings_privacy_policy"));
    assert.ok(ids.includes("v2_staff_settings_charter"));
    assert.doesNotMatch(payload.embeds[0].toJSON().fields[2].value, /\/confidentialite/);
    assert.ok(customIds(page.buildLegal({}, "charter")).includes("page:staff:section:settings"));
});

test("le centre des journaux propose un test seulement après configuration", () => {
    stubModule("src/v2/managers/GuildSettingsV2Manager.js", {
        getErrorLogChannelId: guildId => guildId === "configured" ? "logs" : null
    });
    const pagePath = require.resolve("../src/v2/pages/staff/StaffLogsPage");
    delete require.cache[pagePath];
    const page = require(pagePath);
    const configured = findButton(page.build({ guildId: "configured" }), "v2_staff_logs_test");
    const missing = findButton(page.build({ guildId: "missing" }), "v2_staff_logs_test");
    assert.equal(configured.disabled, false);
    assert.equal(missing.disabled, true);
});

function customIds(payload) {
    return payload.components.flatMap(row =>
        row.toJSON().components.map(component => component.custom_id)
    );
}

function findButton(payload, id) {
    return payload.components.flatMap(row => row.toJSON().components)
        .find(component => component.custom_id === id);
}
