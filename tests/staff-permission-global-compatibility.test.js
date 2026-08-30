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
    "../src/v2/core/services/StaffPermissionDecisionService"
];

function reload() {
    for (const modulePath of MODULES) {
        delete require.cache[require.resolve(modulePath)];
    }
    return {
        manager: require("../src/v2/managers/StaffPermissionV2Manager"),
        settings: require("../src/v2/managers/GuildSettingsV2Manager"),
        validation: require("../src/v2/core/policies/ValidationStaffPolicy"),
        policy: require("../src/v2/core/policies/StaffPermissionPolicy")
    };
}

function interaction({
    guildId = "guild-a", ownerId = "owner", userId = "member",
    roleIds = [], administrator = false, validationAccess = false,
    includeGuild = true, includeMember = true
} = {}) {
    const validationChannel = {
        id: "validation",
        permissionsFor: () => ({ has: () => validationAccess })
    };
    return {
        ...(guildId && { guildId }),
        guild: includeGuild && guildId ? {
            id: guildId,
            ownerId,
            channels: { cache: new Map([["validation", validationChannel]]) }
        } : null,
        user: userId ? { id: userId } : null,
        member: includeMember ? {
            roles: { cache: new Map(roleIds.map(id => [id, {}])) },
            permissions: { has: () => administrator }
        } : null,
        memberPermissions: { has: () => administrator }
    };
}

function insertFixture(database) {
    for (const guildId of ["guild-a", "guild-b"]) {
        database.prepare(`
            INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, '2026-08-30')
        `).run(guildId, guildId);
    }
    const now = "2026-08-30T00:00:00.000Z";
    const insertRole = database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, granted_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'fixture', ?, ?)
    `);
    const insertUser = database.prepare(`
        INSERT INTO GuildStaffUserPermissionsV2 (
            guild_id, discord_user_id, permission_key,
            granted_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'fixture', ?, ?)
    `);
    for (const [guildId, roleId, permission] of [
        ["guild-a", "role-known", "characters"],
        ["guild-a", "role-known", "read_only"],
        ["guild-a", "role-unknown", "old_unknown"],
        ["guild-a", "role-empty", ""],
        ["guild-a", "role-spaces", "   "],
        ["guild-a", "role-star", "*"],
        ["guild-b", "role-foreign", "scenes"]
    ]) insertRole.run(guildId, roleId, permission, now, now);
    for (const [guildId, userId, permission] of [
        ["guild-a", "known-user", "logs"],
        ["guild-a", "known-user", "characters"],
        ["guild-a", "unknown-user", "user_unknown"],
        ["guild-a", "star-user", "*"],
        ["guild-b", "foreign-user", "settings"]
    ]) insertUser.run(guildId, userId, permission, now, now);
}

test("2B.3b reproduit l'oracle historique global sans filtrer les grants", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertFixture(isolated.database);
    const { manager, settings, policy } = reload();
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild-b", enabled: false, updatedBy: "owner"
    });

    const cases = [
        [interaction({ userId: "owner" }), ["*"]],
        [interaction({ administrator: true }), ["*"]],
        [interaction({ roleIds: ["role-known"] }), ["characters", "read_only"]],
        [interaction({ userId: "known-user" }), ["characters", "logs"]],
        [interaction({ userId: "known-user", roleIds: ["role-known"] }), ["characters", "read_only", "logs"]],
        [interaction({ roleIds: ["role-unknown"] }), ["old_unknown"]],
        [interaction({ userId: "unknown-user" }), ["user_unknown"]],
        [interaction({ roleIds: ["role-empty"] }), [""]],
        [interaction({ roleIds: ["role-spaces"] }), ["   "]],
        [interaction({ roleIds: ["role-star"] }), ["*"]],
        [interaction({ userId: "star-user" }), ["*"]],
        [interaction(), []],
        [interaction({ guildId: "guild-b", roleIds: ["role-known"] }), []],
        [interaction({ guildId: "guild-b", userId: "known-user" }), []],
        [interaction({ guildId: null, includeGuild: false }), []],
        [interaction({ includeMember: false, userId: "known-user" }), ["characters", "logs"]]
    ];
    for (const [currentInteraction, expected] of cases) {
        const granted = policy.getGrantedPermissions(currentInteraction);
        assert.equal(Array.isArray(granted), true);
        assert.deepEqual(new Set(granted), new Set(expected));
        assert.equal(policy.canOpenCenter(currentInteraction), expected.length > 0);
    }

    settings.setValidationChannel("guild-a", "validation");
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: true, updatedBy: "owner"
    });
    const legacy = interaction({ validationAccess: true });
    assert.deepEqual(policy.getGrantedPermissions(legacy), ["*"]);
    assert.equal(policy.canOpenCenter(legacy), true);
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    assert.deepEqual(policy.getGrantedPermissions(legacy), []);
    assert.equal(policy.canOpenCenter(legacy), false);
});

test("2B.3b déduplique et résout chaque source globale une seule fois", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertFixture(isolated.database);
    const { manager, validation, policy } = reload();
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: true, updatedBy: "owner"
    });
    const counts = { roles: 0, user: 0, setting: 0, validation: 0 };
    for (const [method, key] of [
        ["getPermissionSourcesForRoles", "roles"],
        ["getUserPermissions", "user"],
        ["getValidationChannelAccess", "setting"]
    ]) {
        const original = manager[method].bind(manager);
        manager[method] = (...args) => {
            counts[key] += 1;
            return original(...args);
        };
    }
    validation.canManageServerTools = () => {
        counts.validation += 1;
        return false;
    };
    const granted = policy.getGrantedPermissions(interaction({
        userId: "known-user", roleIds: ["role-known"]
    }));
    assert.deepEqual(granted, ["characters", "read_only", "logs"]);
    assert.deepEqual(counts, { roles: 1, user: 1, setting: 1, validation: 1 });
});

test("2B.3b court-circuite les racines et conserve les autres façades", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertFixture(isolated.database);
    const { manager, validation, policy } = reload();
    for (const method of [
        "getPermissionSourcesForRoles",
        "getUserPermissions",
        "getValidationChannelAccess"
    ]) manager[method] = () => { throw new Error("lecture interdite"); };
    validation.canManageServerTools = () => {
        throw new Error("validation interdite");
    };
    assert.deepEqual(policy.getGrantedPermissions(interaction({ userId: "owner" })), ["*"]);
    assert.deepEqual(policy.getGrantedPermissions(interaction({ administrator: true })), ["*"]);
    assert.equal(policy.canManagePermissions(interaction({ userId: "owner" })), true);
    assert.equal(policy.canManageCharacters(interaction({ userId: "owner" })), true);
});
