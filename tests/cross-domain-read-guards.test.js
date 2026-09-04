const test = require("node:test");
const assert = require("node:assert/strict");
const { PermissionFlagsBits } = require("discord.js");
const { stubModule } = require("./helpers/moduleStub");

let assignments = [];
let effects = [];
stubModule("src/v2/managers/StaffPermissionV2Manager.js", {
    getPermissionAssignmentsForRoles: () => [],
    getUserPermissionAssignments: () => assignments,
    getPermissionDefaults: () => []
});
stubModule("src/v2/core/services/ValidationBridgeQualificationService.js", {
    qualify: () => { throw new Error("Bridge interdit"); }
});
stubModule("src/v2/core/services/InteractionResponseService.js", {
    replyError: async () => effects.push("deny")
});
stubModule("src/v2/managers/GuildModuleV2Manager.js", {
    getModule: () => ({}),
    isEnabled: () => true,
    setEnabled: (guildId, key, enabled) => {
        assert.equal(enabled, false);
        effects.push("mutation");
    }
});
stubModule("src/v2/managers/StateTypeV2Manager.js", {
    createStateType: () => effects.push("mutation"),
    installDefaultStateTypes: () => effects.push("mutation")
});
for (const page of ["StaffPhonePage", "StaffRelationshipsPage", "StaffUniversePage", "StaffAssetsPage"]) {
    stubModule(`src/v2/pages/staff/${page}.js`, {
        build: () => { effects.push("page-read"); return { content: "page" }; }
    });
}
const buttons = require("../src/v2/router/buttons/StaffRouter");
const modals = require("../src/v2/router/modals/StaffModalRouter");
const flows = [
    ["phone", "modules", "v2_staff_domain_toggle:phone", buttons],
    ["relationships", "modules", "v2_staff_domain_toggle:relationships", buttons],
    ["assets", "modules", "v2_staff_domain_toggle:assets", buttons],
    ["universe", "characters", "v2_staff_universe_install_states", buttons],
    ["universe", "characters", "v2_staff_universe_create_state_submit", modals]
];

for (const [domain, writer, customId, route] of flows) {
    test(`2C.8D ${customId}: READ indépendant, fallback, deny et roots`, async () => {
        for (const scenario of ["allow", "absent", "deny", "fallback", "fallback-deny", "owner", "admin", "legacy", "read-only"]) {
            assignments = [grant(writer)];
            if (scenario === "allow") assignments.push(grant(domain));
            if (scenario.includes("deny")) assignments.push(grant(domain, "deny"));
            if (scenario.startsWith("fallback")) assignments.push(grant("read_only"));
            if (scenario === "read-only") assignments = [grant("read_only")];
            if (scenario === "legacy") assignments = [];
            effects = [];
            let payload;
            const has = bit => scenario === "admin" && bit === PermissionFlagsBits.Administrator
                || scenario === "legacy" && [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ViewChannel].includes(bit);
            await route({
                customId, guildId: "guild", guild: { id: "guild", ownerId: "owner" },
                user: { id: scenario === "owner" ? "owner" : "user" },
                member: { permissions: { has }, roles: { cache: new Map() } },
                memberPermissions: { has }, isButton: () => true,
                fields: { getTextInputValue: key => key === "name" ? "État" : "" },
                update: async value => { payload = value; effects.push("response"); }
            });
            if (["read-only", "legacy"].includes(scenario)) {
                assert.deepEqual(effects, ["deny"], scenario);
            } else if (["allow", "fallback", "owner", "admin"].includes(scenario)) {
                assert.deepEqual(effects, ["mutation", "page-read", "response"], scenario);
            } else {
                assert.deepEqual(effects, ["mutation", "response"], scenario);
                assert.match(payload.content, /^✅ /);
                assert.deepEqual(payload.embeds, []);
                assert.deepEqual(payload.components, []);
                if (writer === "modules") assert.equal(payload.content, "✅ Module désactivé.");
            }
        }
    });
}

function grant(permissionKey, effect = "allow") { return { permissionKey, effect }; }
