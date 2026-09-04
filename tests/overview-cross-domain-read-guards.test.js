const test = require("node:test");
const assert = require("node:assert/strict");
const { PermissionFlagsBits } = require("discord.js");
const { stubModule } = require("./helpers/moduleStub");

let assignments = [];
let reads = [];
const read = (domain, value) => () => { reads.push(domain); return value; };
stubModule("src/v2/managers/StaffPermissionV2Manager.js", {
    getPermissionAssignmentsForRoles: () => [],
    getUserPermissionAssignments: () => assignments,
    getPermissionDefaults: () => [],
    getAssignments: read("staff", { roles: [{ role_id: "secret-role" }], users: [{ discord_user_id: "secret-user" }] }),
    getValidationChannelAccess: read("staff", true)
});
stubModule("src/v2/core/services/ValidationBridgeQualificationService.js", {
    qualify: () => { throw new Error("Bridge interdit dans overview"); }
});
stubModule("src/v2/managers/GuildSettingsV2Manager.js", {
    getValidationChannelId: read("settings", "validation"),
    getErrorLogChannelId: read("logs", "secret-log"),
    getMaintenance: read("settings", { enabled: false }),
    getPlayedCharacterCreationLimit: read("settings", { enabled: false })
});
stubModule("src/v2/managers/GuildModuleV2Manager.js", {
    getAll: read("modules", [{ id: 1 }]),
    getConfiguration: read("modules", [{ label: "secret-module", emoji: "📦", isEnabled: true }])
});
stubModule("src/v2/managers/CharacterApprovalAutomationV2Manager.js", {
    getConfiguration: read("automations", { is_enabled: 1, approved_character_count: 42, required_role_id: "secret-approval", welcome_channel_id: "secret-welcome" })
});
stubModule("src/v2/repositories/RelationshipTypeRepository.js", { getByGuild: read("relationships", [{ id: 1 }]) });
stubModule("src/v2/managers/StateTypeV2Manager.js", { getStateTypesByGuild: read("universe", [{ id: 1 }]) });
stubModule("src/v2/managers/NarrativeEntityV2Manager.js", { getByGuild: read("entities", [{ id: 1, is_enabled: true }]) });
stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
    getConfiguration: read("scenes", { is_enabled: 1 }),
    getScopes: read("scenes", [{ channel_id: "secret-scene" }]),
    getTriggerExpressions: read("scenes", [{ expression: "secret-expression" }])
});
stubModule("src/v2/pages/staff/StaffCharactersPage.js", {
    navigationRow: () => new (require("discord.js").ActionRowBuilder)()
});
const page = require("../src/v2/pages/staff/StaffConfigurationOverviewPage");
const setup = require("../src/v2/pages/staff/StaffSetupPage");
const domains = ["modules", "relationships", "universe", "entities", "scenes", "automations", "logs"];
const markers = { modules: "secret-module", relationships: "Relations : **1", universe: "États : **1", entities: "Entités : **1", scenes: "secret-scene", automations: "secret-approval", logs: "secret-log" };
const grant = (permissionKey, effect = "allow") => ({ permissionKey, effect });

test("2C.8D overview settings seul ne lit aucun autre domaine ni permissions staff", () => {
    assignments = [grant("settings")];
    const payload = render();
    assert.deepEqual([...new Set(reads)], ["settings"]);
    assert.doesNotMatch(JSON.stringify(payload), /secret-/);
    for (const row of payload.components.slice(0, 2)) {
        for (const button of row.components) {
            assert.equal(button.data.disabled, !button.data.custom_id.endsWith(":settings"));
        }
    }
});

for (const domain of domains) {
    test(`2C.8D overview ${domain}: allow isolé et deny spécifique avant lecture`, () => {
        assignments = [grant("settings"), grant(domain)];
        let payload = render();
        assert.deepEqual([...new Set(reads)].sort(), ["settings", domain].sort());
        assert.ok(JSON.stringify(payload).includes(markers[domain]));
        assignments = [grant("settings"), grant("read_only"), grant(domain, "deny")];
        payload = render();
        assert.equal(reads.includes(domain), false);
        assert.equal(reads.includes("staff"), false);
        assert.equal(JSON.stringify(payload).includes(markers[domain]), false);
        for (const other of domains.filter(item => item !== domain)) assert.ok(reads.includes(other), other);
    });
}

test("2C.8D overview fallback read_only ne donne jamais accès au détail staff root-only", () => {
    assignments = [grant("read_only")];
    const payload = render();
    assert.deepEqual([...new Set(reads)].sort(), ["settings", ...domains].sort());
    assert.doesNotMatch(JSON.stringify(payload), /secret-role|secret-user/);
});

test("2C.8D overview owner et Admin restent les seules roots", () => {
    assignments = [];
    for (const role of ["owner", "admin"]) {
        const payload = render(role);
        assert.deepEqual([...new Set(reads)].sort(), ["settings", ...domains, "staff"].sort());
        assert.match(JSON.stringify(payload), /secret-role/);
        assert.match(JSON.stringify(payload), /secret-user/);
    }
    render("legacy");
    assert.deepEqual(reads, []);
});

test("2C.8D checklist protège chaque domaine et ne calcule pas de bilan global sans visibilité", () => {
    const setupDomains = ["logs", "modules", "relationships", "universe", "scenes"];
    assignments = [grant("settings")];
    let payload = render("member", setup);
    assert.deepEqual([...new Set(reads)], ["settings"]);
    assert.match(payload.embeds[0].data.description, /Bilan partiel/);
    for (const domain of setupDomains) {
        assignments = [grant("settings"), grant(domain)];
        render("member", setup);
        assert.deepEqual([...new Set(reads)].sort(), ["settings", domain].sort());
        assignments = [grant("read_only"), grant(domain, "deny")];
        render("member", setup);
        assert.equal(reads.includes(domain), false);
        for (const other of setupDomains.filter(item => item !== domain)) assert.ok(reads.includes(other));
    }
    assignments = [];
    for (const role of ["owner", "admin"]) {
        render(role, setup);
        assert.deepEqual([...new Set(reads)].sort(), ["settings", ...setupDomains].sort());
    }
    render("legacy", setup);
    assert.deepEqual(reads, []);
});

function render(role = "member", target = page) {
    reads = [];
    const has = bit => role === "admin" && bit === PermissionFlagsBits.Administrator
        || role === "legacy" && [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ViewChannel].includes(bit);
    return target.build({
        guildId: "guild", guild: { id: "guild", ownerId: "owner" },
        user: { id: role }, member: { roles: { cache: new Map() }, permissions: { has } },
        memberPermissions: { has }
    });
}
