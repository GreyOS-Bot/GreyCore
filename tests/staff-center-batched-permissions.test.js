const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

const MODULES = [
    "../src/v2/repositories/StaffPermissionRepository",
    "../src/v2/managers/StaffPermissionV2Manager",
    "../src/v2/repositories/GuildSettingsRepository",
    "../src/v2/managers/GuildSettingsV2Manager",
    "../src/v2/core/policies/GuildManagementPolicy",
    "../src/v2/core/policies/ValidationStaffPolicy",
    "../src/v2/core/policies/StaffPermissionPolicy",
    "../src/v2/core/services/ValidationBridgeQualificationService",
    "../src/v2/core/services/StaffPermissionDecisionService",
    "../src/v2/pages/staff/StaffCenterPage"
];

const DOMAIN_KEYS = [
    "characters", "scenes", "phone", "bank", "relationships", "universe",
    "entities", "automations", "modules", "logs", "settings"
];
const ALL_DOMAIN_KEYS = [
    "characters", "scenes", "phone", "bank", "assets", "relationships",
    "universe", "entities", "automations", "modules", "logs", "settings"
];

function reload() {
    for (const modulePath of MODULES) {
        delete require.cache[require.resolve(modulePath)];
    }
    return {
        manager: require("../src/v2/managers/StaffPermissionV2Manager"),
        settings: require("../src/v2/managers/GuildSettingsV2Manager"),
        validation: require("../src/v2/core/policies/ValidationStaffPolicy"),
        policy: require("../src/v2/core/policies/StaffPermissionPolicy"),
        decisions: require("../src/v2/core/services/StaffPermissionDecisionService"),
        page: require("../src/v2/pages/staff/StaffCenterPage")
    };
}

function interaction({
    guildId = "guild-a", ownerId = "owner", userId = "member",
    roleIds = [], administrator = false, validationAccess = false
} = {}) {
    const validationChannel = {
        id: "validation",
        permissionsFor: () => ({ has: () => validationAccess })
    };
    return {
        guildId,
        guild: {
            id: guildId,
            ownerId,
            channels: { cache: new Map([["validation", validationChannel]]) }
        },
        user: { id: userId },
        member: {
            roles: { cache: new Map(roleIds.map(id => [id, {}])) },
            permissions: { has: () => administrator }
        },
        memberPermissions: { has: () => administrator }
    };
}

function sectionIds(payload) {
    return payload.components
        .flatMap(row => row.toJSON().components)
        .map(component => component.custom_id)
        .filter(customId => customId.startsWith("page:staff:section:"));
}

function legacyExpected(policy, decisions, currentInteraction) {
    const visible = DOMAIN_KEYS
        .filter(key => policy.canAccess(currentInteraction, key))
        .map(key => `page:staff:section:${key}`);
    if (decisions.decide({
        interaction: currentInteraction,
        permission: "assets",
        write: false
    }).allowed) {
        visible.splice(4, 0, "page:staff:section:assets");
    }
    if (policy.canManagePermissions(currentInteraction)) {
        visible.push("page:staff:section:permissions");
    }
    if (policy.canAccess(currentInteraction, "settings")) {
        visible.unshift("page:staff:section:setup");
        visible.unshift("page:staff:section:overview");
    }
    return visible;
}

function insertFixtures(database) {
    for (const guildId of ["guild-a", "guild-b"]) {
        database.prepare(`
            INSERT INTO Guilds (id, name, created_at)
            VALUES (?, ?, '2026-08-30')
        `).run(guildId, guildId);
    }
    const manager = require("../src/v2/managers/StaffPermissionV2Manager");
    for (const [roleId, keys] of [
        ["characters-role", ["characters"]],
        ["scenes-role", ["scenes"]],
        ["settings-role", ["settings"]],
        ["reader-role", ["read_only"]],
        ["wildcard-role", ["*"]],
        ["unknown-role", ["unknown_permission"]],
        ["mixed-role", ["characters", "phone"]]
    ]) {
        manager.replaceRolePermissions({
            guildId: "guild-a", roleId, permissionKeys: keys,
            grantedBy: "owner"
        });
    }
    manager.replaceUserPermissions({
        guildId: "guild-a", discordUserId: "mixed-user",
        permissionKeys: ["logs", "settings"], grantedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild-b", enabled: false, updatedBy: "owner"
    });
}

test("2B.3c conserve exactement les sections historiques et leur ordre", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    let loaded = reload();
    insertFixtures(isolated.database);
    loaded = reload();

    const fixtures = [
        interaction(),
        interaction({ roleIds: ["characters-role"] }),
        interaction({ roleIds: ["scenes-role"] }),
        interaction({ roleIds: ["settings-role"] }),
        interaction({ roleIds: ["mixed-role"], userId: "mixed-user" }),
        interaction({ roleIds: ["reader-role"] }),
        interaction({ roleIds: ["wildcard-role"] }),
        interaction({ roleIds: ["unknown-role"] }),
        interaction({ userId: "owner" }),
        interaction({ administrator: true }),
        interaction({ guildId: "guild-b", roleIds: ["scenes-role"] })
    ];
    for (const currentInteraction of fixtures) {
        const expected = legacyExpected(
            loaded.policy, loaded.decisions, currentInteraction
        );
        assert.deepEqual(sectionIds(loaded.page.build(currentInteraction)), expected);
    }

    loaded.settings.setValidationChannel("guild-a", "validation");
    loaded.manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: true, updatedBy: "owner"
    });
    const legacy = interaction({ validationAccess: true });
    assert.deepEqual(
        sectionIds(loaded.page.build(legacy)),
        legacyExpected(loaded.policy, loaded.decisions, legacy)
    );
});

test("2B.3c résout le rendu une fois sans remplacer les revalidations", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    let loaded = reload();
    insertFixtures(isolated.database);
    loaded = reload();
    const counts = { batches: 0, access: 0, validation: 0 };
    const originalBatch = loaded.decisions.decideMany.bind(loaded.decisions);
    loaded.decisions.decideMany = options => {
        counts.batches += 1;
        if (options.legacyCanAccessParity === true) {
            assert.deepEqual(options.requests, DOMAIN_KEYS.map(permission => ({
                permission, write: false
            })));
        } else {
            assert.deepEqual(options.requests, [{
                permission: "assets", write: false
            }]);
        }
        return originalBatch(options);
    };
    loaded.policy.canAccess = () => {
        counts.access += 1;
        throw new Error("canAccess ne doit pas construire le rendu");
    };
    loaded.validation.canManageServerTools = () => {
        counts.validation += 1;
        return false;
    };

    loaded.page.build(interaction({
        roleIds: ["mixed-role"], userId: "mixed-user"
    }));
    assert.deepEqual(counts, { batches: 2, access: 0, validation: 0 });
});

test("2B.3c court-circuite les racines sans lecture et garde Permissions séparé", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    let loaded = reload();
    insertFixtures(isolated.database);
    loaded = reload();
    for (const method of [
        "getPermissionSourcesForRoles",
        "getUserPermissions",
        "getValidationChannelAccess"
    ]) loaded.manager[method] = () => { throw new Error("lecture interdite"); };
    loaded.validation.canManageServerTools = () => {
        throw new Error("validation interdite");
    };
    for (const currentInteraction of [
        interaction({ userId: "owner" }),
        interaction({ administrator: true })
    ]) {
        const ids = sectionIds(loaded.page.build(currentInteraction));
        assert.equal(ids.includes("page:staff:section:permissions"), true);
        assert.deepEqual(
            ids.filter(id => !id.endsWith(":permissions")),
            [
                "page:staff:section:overview",
                "page:staff:section:setup",
                ...ALL_DOMAIN_KEYS.map(key => `page:staff:section:${key}`)
            ]
        );
    }
});
