const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

let assignments = [];
let calls;
const grant = (permissionKey, effect = "allow") => ({ permissionKey, effect });
stubModule("src/v2/managers/StaffPermissionV2Manager.js", {
    getPermissionAssignmentsForRoles: () => [],
    getUserPermissionAssignments: () => assignments,
    getPermissionDefaults: () => []
});
stubModule("src/v2/core/services/ValidationBridgeQualificationService.js", {
    qualify: () => { throw new Error("No Validation Bridge for creation limit"); }
});
const settings = {
    getPlayedCharacterCreationLimit: guildId => {
        assert.equal(guildId, "guild");
        calls.reads += 1;
        return { enabled: false, limitCount: 2, windowDays: 7 };
    },
    configurePlayedCharacterCreationLimit: (guildId, data) => {
        calls.writes.push({ guildId, ...data });
        return { pj_creation_limit_count: data.limitCount, pj_creation_limit_window_days: data.windowDays };
    }
};
stubModule("src/v2/managers/GuildSettingsV2Manager.js", settings);
stubModule("src/v2/index.js", { managers: { guildSettings: settings } });
stubModule("src/v2/repositories/GuildRepository.js", { ensure: () => { calls.ensure += 1; } });
stubModule("src/v2/interactions/settings/GuildModuleSettingsHandler.js", {});
stubModule("src/v2/managers/SceneAssistantV2Manager.js", {});
stubModule("src/v2/pages/staff/StaffScenesPage.js", {});
stubModule("src/v2/pages/staff/StaffAutomationsPage.js", {
    build: () => { calls.page += 1; return {}; }
});
stubModule("src/v2/services/automation/ApprovalAutomationDraftService.js", {});
stubModule("src/v2/core/services/InteractionResponseService.js", {
    replyError: () => { calls.errors += 1; }
});
const command = require("../src/commands/config");
const buttons = require("../src/v2/router/buttons/StaffRouter");
const modals = require("../src/v2/router/modals/StaffModalRouter");

function reset() {
    calls = { reads: 0, writes: [], ensure: 0, errors: 0, page: 0, fields: 0, modal: 0 };
}
function target(customId = "") {
    return {
        customId, guildId: "guild", guild: { id: "guild", name: "Guild", ownerId: "owner" },
        user: { id: "member" }, member: { roles: [], permissions: { has: () => false } },
        memberPermissions: { has: () => false },
        isButton: () => true,
        options: {
            getSubcommand: () => "limite-pj",
            getBoolean: () => { calls.fields += 1; return true; },
            getInteger: () => null
        },
        fields: { getTextInputValue: key => { calls.fields += 1; return key === "limit_count" ? "3" : "9"; } },
        reply: async () => {}, update: async () => {},
        showModal: async () => { calls.modal += 1; }
    };
}

test("review fix 1: /config limite-pj exige automations avant lecture et mutation", async () => {
    for (const denied of [
        [grant("settings")],
        [grant("settings"), grant("automations", "deny")],
        [grant("read_only")]
    ]) {
        assignments = denied;
        reset();
        await command.execute(target());
        assert.deepEqual(calls, { reads: 0, writes: [], ensure: 0, errors: 1, page: 0, fields: 0, modal: 0 });
    }
    assignments = [grant("automations")];
    reset();
    await command.execute(target());
    assert.equal(calls.errors, 0);
    assert.equal(calls.reads, 1);
    assert.equal(calls.ensure, 1);
    assert.deepEqual(calls.writes, [{ guildId: "guild", enabled: true, limitCount: 2, windowDays: 7 }]);
});

test("review fix 1: boutons et submit limite PJ restent automations/write", async () => {
    for (const [handler, action, expectedReads, expectedWrites] of [
        [buttons, "creation_limit", 1, 0],
        [buttons, "toggle_limit", 1, 1],
        [modals, "creation_limit_submit", 0, 1]
    ]) {
        assignments = [grant("settings"), grant("automations", "deny")];
        reset();
        await handler(target(`v2_staff_automations_${action}`));
        assert.deepEqual(calls, { reads: 0, writes: [], ensure: 0, errors: 1, page: 0, fields: 0, modal: 0 });
        assignments = [grant("automations")];
        reset();
        await handler(target(`v2_staff_automations_${action}`));
        assert.equal(calls.errors, 0);
        assert.equal(calls.reads, expectedReads);
        assert.equal(calls.writes.length, expectedWrites);
        if (action === "creation_limit") assert.equal(calls.modal, 1);
        if (action === "toggle_limit") assert.deepEqual(calls.writes, [{ guildId: "guild", enabled: true, limitCount: 2, windowDays: 7 }]);
        if (action === "creation_limit_submit") assert.deepEqual(calls.writes, [{ guildId: "guild", enabled: true, limitCount: 3, windowDays: 9 }]);
    }
});

test("review fix 1: retrait du droit entre ouverture et submit sans aucun effet", async () => {
    assignments = [grant("automations")];
    reset();
    await buttons(target("v2_staff_automations_creation_limit"));
    assert.equal(calls.modal, 1);
    assignments = [grant("settings"), grant("automations", "deny")];
    reset();
    await modals(target("v2_staff_automations_creation_limit_submit"));
    assert.deepEqual(calls, { reads: 0, writes: [], ensure: 0, errors: 1, page: 0, fields: 0, modal: 0 });
});
