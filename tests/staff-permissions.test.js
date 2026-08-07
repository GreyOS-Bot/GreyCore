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
