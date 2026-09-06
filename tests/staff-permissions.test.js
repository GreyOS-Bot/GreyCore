const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

test("les permissions GreyCore sont déléguées par rôle et isolées par serveur", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild', 'Greyline', '2026-08-07')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/repositories/GuildSettingsRepository",
        "../src/v2/managers/GuildSettingsV2Manager",
        "../src/v2/core/policies/ValidationStaffPolicy",
        "../src/v2/core/services/StaffPermissionDecisionService",
        "../src/v2/core/policies/StaffPermissionPolicy"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }

    const manager = require("../src/v2/managers/StaffPermissionV2Manager");
    const policy = require("../src/v2/core/policies/StaffPermissionPolicy");
    manager.replaceRolePermissions({
        guildId: "guild",
        roleId: "scene-role",
        permissionKeys: ["scenes"],
        grantedBy: "owner"
    });

    const interaction = {
        guildId: "guild",
        guild: { ownerId: "owner", channels: { cache: new Map() } },
        user: { id: "member" },
        member: {
            roles: { cache: new Map([["scene-role", {}]]) },
            permissions: { has: () => false }
        },
        memberPermissions: { has: () => false }
    };

    assert.equal(policy.canOpenCenter(interaction), true);
    assert.equal(policy.canAccess(interaction, "scenes"), true);
    assert.equal(policy.canAccess(interaction, "phone"), false);
    assert.equal(policy.canManagePermissions(interaction), false);
    assert.equal(
        policy.canManagePermissions({
            ...interaction,
            user: { id: "owner" }
        }),
        true
    );
});

test("la lecture seule ouvre toutes les pages sans autoriser leur écriture", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild', 'Greyline', '2026-08-07')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/repositories/GuildSettingsRepository",
        "../src/v2/managers/GuildSettingsV2Manager",
        "../src/v2/core/policies/ValidationStaffPolicy",
        "../src/v2/core/services/StaffPermissionDecisionService",
        "../src/v2/core/policies/StaffPermissionPolicy"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }
    const manager = require("../src/v2/managers/StaffPermissionV2Manager");
    const policy = require("../src/v2/core/policies/StaffPermissionPolicy");
    manager.replaceRolePermissions({
        guildId: "guild",
        roleId: "reader",
        permissionKeys: ["read_only"],
        grantedBy: "owner"
    });
    const interaction = {
        guildId: "guild",
        guild: { ownerId: "owner", channels: { cache: new Map() } },
        user: { id: "reader-user" },
        member: {
            roles: { cache: new Map([["reader", {}]]) },
            permissions: { has: () => false }
        },
        memberPermissions: { has: () => false }
    };

    assert.equal(policy.canAccess(interaction, "bank"), true);
    assert.equal(
        policy.canAccess(interaction, "bank", { write: true }),
        false
    );
});

test("un utilisateur particulier peut recevoir ses propres domaines", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild', 'Greyline', '2026-08-07')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/repositories/GuildSettingsRepository",
        "../src/v2/managers/GuildSettingsV2Manager",
        "../src/v2/core/policies/ValidationStaffPolicy",
        "../src/v2/core/services/StaffPermissionDecisionService",
        "../src/v2/core/policies/StaffPermissionPolicy"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }
    const manager = require("../src/v2/managers/StaffPermissionV2Manager");
    const policy = require("../src/v2/core/policies/StaffPermissionPolicy");
    manager.replaceUserPermissions({
        guildId: "guild",
        discordUserId: "specific-user",
        permissionKeys: ["phone", "bank"],
        grantedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild",
        enabled: false,
        updatedBy: "owner"
    });
    const interaction = {
        guildId: "guild",
        guild: { ownerId: "owner", channels: { cache: new Map() } },
        user: { id: "specific-user" },
        member: {
            roles: { cache: new Map() },
            permissions: { has: () => false }
        },
        memberPermissions: { has: () => false }
    };

    assert.equal(policy.canAccess(interaction, "phone"), true);
    assert.equal(policy.canAccess(interaction, "bank"), true);
    assert.equal(policy.canAccess(interaction, "scenes"), false);
    assert.equal(manager.getValidationChannelAccess("guild"), false);
});

test("plusieurs rôles et utilisateurs reçoivent leurs permissions en une seule opération", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild-multiple', 'Greyline', '2026-08-07')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }
    const manager = require("../src/v2/managers/StaffPermissionV2Manager");

    const roles = manager.replaceRolePermissionsForMany({
        guildId: "guild-multiple",
        roleIds: ["role-a", "role-b"],
        permissionKeys: ["characters", "scenes"],
        grantedBy: "owner"
    });
    const users = manager.replaceUserPermissionsForMany({
        guildId: "guild-multiple",
        discordUserIds: ["user-a", "user-b"],
        permissionKeys: ["phone"],
        grantedBy: "owner"
    });

    assert.equal(roles.length, 2);
    assert.equal(users.length, 2);
    assert.deepEqual(manager.getRolePermissions("guild-multiple", "role-b"), ["characters", "scenes"]);
    assert.deepEqual(manager.getUserPermissions("guild-multiple", "user-a"), ["phone"]);
});
