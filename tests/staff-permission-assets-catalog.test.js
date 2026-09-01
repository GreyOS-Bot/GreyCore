const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

const MODULES = [
    "../src/v2/core/permissions/StaffPermissionCatalog",
    "../src/v2/repositories/StaffPermissionRepository",
    "../src/v2/managers/StaffPermissionV2Manager",
    "../src/v2/repositories/GuildSettingsRepository",
    "../src/v2/managers/GuildSettingsV2Manager",
    "../src/v2/core/policies/GuildManagementPolicy",
    "../src/v2/core/policies/ValidationStaffPolicy",
    "../src/v2/core/policies/StaffPermissionPolicy",
    "../src/v2/core/services/StaffPermissionDecisionService"
];

function reload() {
    for (const modulePath of MODULES) {
        delete require.cache[require.resolve(modulePath)];
    }
    return {
        catalog: require("../src/v2/core/permissions/StaffPermissionCatalog"),
        manager: require("../src/v2/managers/StaffPermissionV2Manager"),
        legacy: require("../src/v2/core/policies/StaffPermissionPolicy"),
        decisions: require("../src/v2/core/services/StaffPermissionDecisionService")
    };
}

function setup(context) {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild-a', 'Guild A', '2026-09-01')
    `).run();
    return { ...isolated, ...reload() };
}

function interaction(roleIds = [], userId = "member") {
    return {
        guildId: "guild-a",
        guild: {
            id: "guild-a",
            ownerId: "owner",
            channels: { cache: new Map() }
        },
        user: { id: userId },
        member: {
            roles: { cache: new Map(roleIds.map(id => [id, {}])) },
            permissions: { has: () => false }
        },
        memberPermissions: { has: () => false }
    };
}

function insertRole(database, roleId, permissionKey, effect) {
    database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, effect,
            granted_by, created_at, updated_at
        ) VALUES ('guild-a', ?, ?, ?, 'owner', 'before', 'before')
    `).run(roleId, permissionKey, effect);
}

function insertUser(database, userId, permissionKey, effect) {
    database.prepare(`
        INSERT INTO GuildStaffUserPermissionsV2 (
            guild_id, discord_user_id, permission_key, effect,
            granted_by, created_at, updated_at
        ) VALUES ('guild-a', ?, ?, ?, 'owner', 'before', 'before')
    `).run(userId, permissionKey, effect);
}

test("2C.4a ajoute Biens au catalogue sans créer de configuration", context => {
    const api = setup(context);
    assert.deepEqual(api.catalog.get("assets"), {
        key: "assets",
        label: "Biens",
        emoji: "🎒"
    });
    assert.equal(api.catalog.all().length, 13);
    assert.deepEqual(api.catalog.keys().slice(3, 6), [
        "bank", "assets", "relationships"
    ]);
    for (const table of [
        "GuildStaffRolePermissionsV2",
        "GuildStaffUserPermissionsV2",
        "GuildStaffPermissionDefaultsV2"
    ]) {
        assert.equal(
            api.database.prepare(`SELECT COUNT(*) AS total FROM ${table}`)
                .get().total,
            0
        );
    }
});

test("2C.4a applique implicit deny et le fallback read_only à assets", context => {
    const api = setup(context);
    const denied = api.decisions.decide({
        interaction: interaction(), permission: "assets", write: true
    });
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, "IMPLICIT_DENY");

    insertRole(api.database, "reader", "read_only", "allow");
    const readable = api.decisions.decide({
        interaction: interaction(["reader"]),
        permission: "assets",
        write: false
    });
    assert.equal(readable.allowed, true);
    assert.equal(readable.reason, "READ_ONLY");
});

test("2C.4a interprète NULL, allow et deny assets selon le resolver strict", context => {
    const api = setup(context);
    for (const [roleId, effect, allowed, reason] of [
        ["legacy-assets", null, true, "ROLE_ALLOW"],
        ["allow-assets", "allow", true, "ROLE_ALLOW"],
        ["deny-assets", "deny", false, "ROLE_DENY"]
    ]) {
        insertRole(api.database, roleId, "assets", effect);
        const current = interaction([roleId]);
        const strict = api.decisions.decide({
            interaction: current, permission: "assets", write: true
        });
        assert.equal(strict.allowed, allowed);
        assert.equal(strict.reason, reason);
        assert.equal(api.legacy.getGrantedPermissions(current).includes("assets"), true);
        assert.equal(api.decisions.decide({
            interaction: current,
            permission: "assets",
            write: true,
            legacyCanAccessParity: true
        }).allowed, true);
    }
});

test("2C.4a retire assets du diagnostic unknown sans masquer les autres clés", context => {
    const api = setup(context);
    for (const [roleId, effect] of [
        ["assets-null", null],
        ["assets-allow", "allow"],
        ["assets-deny", "deny"]
    ]) insertRole(api.database, roleId, "assets", effect);
    insertRole(api.database, "wildcard", "*", null);
    insertRole(api.database, "empty", "", "allow");
    insertUser(api.database, "spaces", "   ", "deny");
    insertUser(api.database, "custom", "custom_unknown", null);

    assert.deepEqual(api.manager.getLegacyAssignmentDiagnostic("guild-a"), {
        roles: 2,
        users: 2,
        total: 4
    });
});
