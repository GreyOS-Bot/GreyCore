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
