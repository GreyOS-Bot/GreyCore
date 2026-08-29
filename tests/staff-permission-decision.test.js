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

function reloadPermissionModules() {
    for (const modulePath of MODULES) {
        delete require.cache[require.resolve(modulePath)];
    }
    return {
        manager: require("../src/v2/managers/StaffPermissionV2Manager"),
        settings: require("../src/v2/managers/GuildSettingsV2Manager"),
        legacy: require("../src/v2/core/policies/StaffPermissionPolicy"),
        decisions: require("../src/v2/core/services/StaffPermissionDecisionService")
    };
}

function interaction({
    guildId = "guild-a",
    ownerId = "owner",
    userId = "member",
    roleIds = [],
    administrator = false,
    validationAccess = false,
    includeMember = true
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
        user: userId ? { id: userId } : null,
        member: includeMember ? {
            roles: { cache: new Map(roleIds.map(id => [id, {}])) },
            permissions: { has: () => administrator }
        } : null,
        memberPermissions: { has: () => administrator }
    };
}

test("2A reproduit les décisions staff historiques et explique leur source", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    for (const id of ["guild-a", "guild-b"]) {
        isolated.database.prepare(`
            INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, ?)
        `).run(id, id, "2026-08-29");
    }

    const { manager, settings, legacy, decisions } = reloadPermissionModules();
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild-b", enabled: false, updatedBy: "owner"
    });
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-scenes",
        permissionKeys: ["scenes"], grantedBy: "owner"
    });
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-phone",
        permissionKeys: ["phone"], grantedBy: "owner"
    });
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-reader",
        permissionKeys: ["read_only"], grantedBy: "owner"
    });
    manager.replaceUserPermissions({
        guildId: "guild-a", discordUserId: "direct-user",
        permissionKeys: ["bank"], grantedBy: "owner"
    });
    manager.replaceRolePermissions({
        guildId: "guild-b", roleId: "role-scenes",
        permissionKeys: ["entities"], grantedBy: "owner"
    });

    function compare(currentInteraction, permission, write = false) {
        const decision = decisions.decide({
            interaction: currentInteraction, permission, write
        });
        assert.equal(
            decision.allowed,
            legacy.canAccess(currentInteraction, permission, { write })
        );
        return decision;
    }

    const owner = compare(interaction({ userId: "owner" }), "scenes", true);
    assert.equal(owner.reason, "GUILD_OWNER");

    const admin = compare(interaction({ administrator: true }), "settings", true);
    assert.equal(admin.reason, "DISCORD_ADMINISTRATOR");

    const role = compare(interaction({ roleIds: ["role-scenes"] }), "scenes", true);
    assert.equal(role.reason, "ROLE_PERMISSION");
    assert.deepEqual(role.sources.map(source => source.roleId), ["role-scenes"]);

    const rolesInteraction = interaction({
        roleIds: ["role-phone", "role-scenes"]
    });
    assert.equal(compare(rolesInteraction, "scenes", true).allowed, true);
    assert.equal(compare(rolesInteraction, "phone", true).allowed, true);

    const direct = compare(interaction({ userId: "direct-user" }), "bank", true);
    assert.equal(direct.reason, "USER_PERMISSION");

    const mixed = interaction({
        userId: "direct-user", roleIds: ["role-scenes"]
    });
    assert.equal(compare(mixed, "scenes", true).allowed, true);
    assert.equal(compare(mixed, "bank", true).allowed, true);

    const reader = interaction({ roleIds: ["role-reader"] });
    assert.equal(compare(reader, "universe").reason, "READ_ONLY");
    assert.equal(compare(reader, "universe", true).allowed, false);

    const none = interaction();
    assert.equal(compare(none, "logs").reason, "NO_PERMISSION");

    const unknown = decisions.decide({
        interaction: interaction({ roleIds: ["role-scenes"] }),
        permission: "phase_3_unknown",
        write: false
    });
    assert.deepEqual(unknown, {
        allowed: false,
        permission: "phase_3_unknown",
        mode: "read",
        reason: "NO_PERMISSION",
        sources: []
    });
    assert.equal(
        decisions.decide({
            interaction: interaction({ userId: "owner" }),
            permission: "phase_3_unknown"
        }).reason,
        "GUILD_OWNER"
    );

    const otherGuild = interaction({
        guildId: "guild-b", roleIds: ["role-scenes"]
    });
    assert.equal(compare(otherGuild, "scenes", true).allowed, false);
    assert.equal(compare(otherGuild, "entities", true).allowed, true);

    assert.equal(compare(interaction({ includeMember: false }), "scenes").allowed, false);
    assert.equal(compare(interaction({ roleIds: [] }), "scenes").allowed, false);

    settings.setValidationChannel("guild-a", "validation");
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: true, updatedBy: "owner"
    });
    const validation = interaction({ validationAccess: true });
    assert.equal(
        compare(validation, "automations", true).reason,
        "VALIDATION_LEGACY_ACCESS"
    );
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    assert.equal(compare(validation, "automations", true).allowed, false);
});

test("2A produit des sources déterministes indépendamment de l'ordre des rôles", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild-a', 'Guild A', '2026-08-29')
    `).run();
    const { manager, decisions } = reloadPermissionModules();
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    for (const roleId of ["role-z", "role-a"]) {
        manager.replaceRolePermissions({
            guildId: "guild-a", roleId,
            permissionKeys: ["scenes"], grantedBy: "owner"
        });
    }
    const first = decisions.decide({
        interaction: interaction({ roleIds: ["role-z", "role-a"] }),
        permission: "scenes"
    });
    const second = decisions.decide({
        interaction: interaction({ roleIds: ["role-a", "role-z"] }),
        permission: "scenes"
    });
    assert.deepEqual(first, second);
    assert.deepEqual(
        first.sources.map(source => source.roleId),
        ["role-a", "role-z"]
    );
});

test("2B.1 conserve l'oracle historique de canAccess sans assouplir le mode strict", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    for (const id of ["guild-a", "guild-b"]) {
        isolated.database.prepare(`
            INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, ?)
        `).run(id, id, "2026-08-29");
    }
    const { manager, settings, legacy, decisions } = reloadPermissionModules();
    const now = "2026-08-29T00:00:00.000Z";
    const insertRole = isolated.database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, granted_by,
            created_at, updated_at
        ) VALUES (?, ?, ?, 'fixture', ?, ?)
    `);
    const insertUser = isolated.database.prepare(`
        INSERT INTO GuildStaffUserPermissionsV2 (
            guild_id, discord_user_id, permission_key, granted_by,
            created_at, updated_at
        ) VALUES (?, ?, ?, 'fixture', ?, ?)
    `);

    for (const [guildId, roleId, permission] of [
        ["guild-a", "role-reader", "read_only"],
        ["guild-a", "role-unknown", "some_old_permission"],
        ["guild-a", "role-star", "*"],
        ["guild-a", "role-empty", ""],
        ["guild-a", "role-spaces", "   "],
        ["guild-b", "role-foreign", "some_old_permission"]
    ]) {
        insertRole.run(guildId, roleId, permission, now, now);
    }
    for (const [userId, permission] of [
        ["user-reader", "read_only"],
        ["user-unknown", "some_old_permission"],
        ["user-star", "*"]
    ]) {
        insertUser.run("guild-a", userId, permission, now, now);
    }
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild-b", enabled: false, updatedBy: "owner"
    });

    function historicalOracle(currentInteraction, permission, write = false) {
        const granted = legacy.getGrantedPermissions(currentInteraction);
        if (granted.includes("*") || granted.includes(permission)) {
            return true;
        }
        return !write && granted.includes("read_only");
    }

    function assertParity(currentInteraction, permission, write = false) {
        assert.equal(
            legacy.canAccess(currentInteraction, permission, { write }),
            historicalOracle(currentInteraction, permission, write)
        );
    }

    const unknownCases = [
        [interaction({ userId: "owner" }), "unknown", false],
        [interaction({ administrator: true }), "unknown", true],
        [interaction({ roleIds: ["role-reader"] }), "unknown", false],
        [interaction({ roleIds: ["role-reader"] }), "unknown", true],
        [interaction({ userId: "user-reader" }), "unknown", false],
        [interaction({ roleIds: ["role-unknown"] }), "some_old_permission", false],
        [interaction({ roleIds: ["role-unknown"] }), "some_old_permission", true],
        [interaction({ userId: "user-unknown" }), "some_old_permission", true],
        [interaction({ roleIds: ["role-star"] }), "unknown", true],
        [interaction({ userId: "user-star" }), undefined, true],
        [interaction({ roleIds: ["role-reader"] }), null, false],
        [interaction({ roleIds: ["role-empty"] }), "", true],
        [interaction({ roleIds: ["role-spaces"] }), "   ", true],
        [interaction(), "unknown", false],
        [interaction({ roleIds: ["role-foreign"] }), "some_old_permission", true]
    ];
    for (const [currentInteraction, permission, write] of unknownCases) {
        assertParity(currentInteraction, permission, write);
    }

    assert.equal(
        decisions.decide({
            interaction: interaction({ roleIds: ["role-reader"] }),
            permission: "unknown"
        }).allowed,
        false
    );
    assert.equal(
        legacy.canAccess(
            interaction({ roleIds: ["role-reader"] }),
            "unknown"
        ),
        true
    );
    assert.equal(
        legacy.canAccess(
            interaction({ roleIds: ["role-reader"] }),
            "unknown",
            { write: true }
        ),
        false
    );

    settings.setValidationChannel("guild-a", "validation");
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: true, updatedBy: "owner"
    });
    const validation = interaction({ validationAccess: true });
    assertParity(validation, "unknown", false);
    assertParity(validation, "unknown", true);
    assert.equal(
        decisions.decide({
            interaction: validation,
            permission: "unknown",
            legacyCanAccessParity: true
        }).reason,
        "LEGACY_VALIDATION_UNKNOWN_PERMISSION"
    );
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    assert.equal(legacy.canAccess(validation, "unknown"), false);

    const knownPermissions = [
        "characters", "scenes", "phone", "bank", "relationships",
        "universe", "entities", "automations", "modules", "logs",
        "settings"
    ];
    manager.replaceRolePermissions({
        guildId: "guild-a",
        roleId: "role-known",
        permissionKeys: [...knownPermissions, "read_only"],
        grantedBy: "owner"
    });
    const knownInteraction = interaction({ roleIds: ["role-known"] });
    for (const permission of knownPermissions) {
        assertParity(knownInteraction, permission, false);
        assertParity(knownInteraction, permission, true);
    }
    assert.equal(legacy.canAccess(knownInteraction, "read_only"), true);
    assert.equal(
        legacy.canAccess(knownInteraction, "settings", { write: true }),
        true
    );

    assert.equal(legacy.canManageCharacters(knownInteraction), true);
    assert.equal(legacy.canManagePermissions(knownInteraction), false);
    assert.equal(
        legacy.canManagePermissions(interaction({ userId: "owner" })),
        true
    );
    assert.equal(legacy.canOpenCenter(knownInteraction), true);
    assert.deepEqual(
        new Set(legacy.getGrantedPermissions(knownInteraction)),
        new Set([...knownPermissions, "read_only"])
    );
});

test("2B.1 canAccess effectue exactement une décision ciblée", () => {
    const decisionService = require(
        "../src/v2/core/services/StaffPermissionDecisionService"
    );
    const policy = require("../src/v2/core/policies/StaffPermissionPolicy");
    const originalDecide = decisionService.decide;
    const calls = [];
    decisionService.decide = options => {
        calls.push(options);
        return { allowed: true };
    };
    try {
        const currentInteraction = interaction();
        assert.equal(
            policy.canAccess(currentInteraction, "scenes", { write: true }),
            true
        );
        assert.equal(calls.length, 1);
        assert.equal(calls[0].interaction, currentInteraction);
        assert.equal(calls[0].permission, "scenes");
        assert.equal(calls[0].write, true);
        assert.equal(calls[0].legacyCanAccessParity, true);
    } finally {
        decisionService.decide = originalDecide;
    }
});
