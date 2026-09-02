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
    "../src/v2/core/services/ValidationBridgeQualificationService",
    "../src/v2/core/services/StaffPermissionDecisionService"
];

function reload() {
    for (const modulePath of MODULES) {
        delete require.cache[require.resolve(modulePath)];
    }
    return {
        manager: require("../src/v2/managers/StaffPermissionV2Manager"),
        validation: require("../src/v2/core/policies/ValidationStaffPolicy"),
        decisions: require("../src/v2/core/services/StaffPermissionDecisionService")
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

function insertGuilds(database) {
    for (const guildId of ["guild-a", "guild-b"]) {
        database.prepare(`
            INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, '2026-08-30')
        `).run(guildId, guildId);
    }
}

test("2B.3a évalue un batch mixte avec une seule résolution ponctuelle", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuilds(isolated.database);
    const { manager, validation, decisions } = reload();
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "reader",
        permissionKeys: ["read_only"], grantedBy: "owner"
    });
    manager.replaceUserPermissions({
        guildId: "guild-a", discordUserId: "member",
        permissionKeys: ["characters"], grantedBy: "owner"
    });
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

    const result = decisions.decideMany({
        interaction: interaction({ roleIds: ["reader"] }),
        requests: [
            { permission: "characters", write: false },
            { permission: "scenes", write: true },
            { permission: "logs", write: false },
            { permission: "unknown", write: false }
        ]
    });
    assert.deepEqual(
        result.decisions.map(item => [item.permission, item.mode, item.allowed, item.reason]),
        [
            ["characters", "read", true, "USER_ALLOW"],
            ["scenes", "write", false, "IMPLICIT_DENY"],
            ["logs", "read", true, "READ_ONLY"],
            ["unknown", "read", false, "UNKNOWN_PERMISSION"]
        ]
    );
    assert.deepEqual(counts, { roles: 0, user: 0, setting: 0, validation: 0 });
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.decisions), true);
});

test("2B.3a court-circuite owner et Administrator sans lecture", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuilds(isolated.database);
    const { manager, validation, decisions } = reload();
    for (const method of [
        "getPermissionSourcesForRoles",
        "getUserPermissions",
        "getValidationChannelAccess"
    ]) manager[method] = () => { throw new Error("lecture interdite"); };
    validation.canManageServerTools = () => {
        throw new Error("validation interdite");
    };
    const requests = Array.from({ length: 12 }, (_, index) => ({
        permission: index === 11 ? "unknown" : "characters",
        write: index % 2 === 0
    }));
    const owner = decisions.decideMany({
        interaction: interaction({ userId: "owner" }), requests
    });
    const admin = decisions.decideMany({
        interaction: interaction({ administrator: true }), requests
    });
    assert.equal(owner.decisions.every(item => item.allowed), true);
    assert.equal(admin.decisions.every(item => item.allowed), true);
    assert.equal(owner.decisions[0].reason, "GUILD_OWNER");
    assert.equal(admin.decisions[0].reason, "DISCORD_ADMINISTRATOR");
});

test("2B.3a conserve toutes les compatibilités legacy et des sources déterministes", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuilds(isolated.database);
    const now = "2026-08-30T00:00:00.000Z";
    const insertRole = isolated.database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, granted_by, created_at, updated_at
        ) VALUES ('guild-a', ?, ?, 'fixture', ?, ?)
    `);
    for (const [roleId, permission] of [
        ["role-z", "characters"],
        ["role-a", "characters"],
        ["role-unknown", "old_unknown"],
        ["role-reader", "read_only"],
        ["role-star", "*"],
        ["role-empty", ""],
        ["role-spaces", "   "]
    ]) insertRole.run(roleId, permission, now, now);
    isolated.database.prepare(`
        INSERT INTO GuildStaffUserPermissionsV2 (
            guild_id, discord_user_id, permission_key,
            granted_by, created_at, updated_at
        ) VALUES ('guild-a', 'legacy-user', 'user_unknown', 'fixture', ?, ?)
    `).run(now, now);
    const { manager, settings, decisions } = (() => {
        const loaded = reload();
        return {
            ...loaded,
            settings: require("../src/v2/managers/GuildSettingsV2Manager")
        };
    })();
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });

    const roleResult = decisions.decideMany({
        interaction: interaction({
            roleIds: ["role-z", "role-unknown", "role-a", "role-reader"]
        }),
        requests: [
            { permission: "characters" },
            { permission: "old_unknown" },
            { permission: "another_unknown" }
        ],
        legacyCanAccessParity: true
    });
    assert.deepEqual(
        roleResult.decisions[0].sources.map(source => source.roleId),
        ["role-a", "role-z", "role-reader"]
    );
    assert.equal(roleResult.decisions[1].reason, "LEGACY_ROLE_UNKNOWN_PERMISSION");
    assert.equal(roleResult.decisions[2].reason, "LEGACY_READ_ONLY_UNKNOWN_PERMISSION");

    const userResult = decisions.decideMany({
        interaction: interaction({ userId: "legacy-user" }),
        requests: [{ permission: "user_unknown", write: true }],
        legacyCanAccessParity: true
    });
    assert.equal(userResult.decisions[0].reason, "LEGACY_USER_UNKNOWN_PERMISSION");

    const wildcard = decisions.decideMany({
        interaction: interaction({ roleIds: ["role-star"] }),
        requests: [{ permission: "anything", write: true }],
        legacyCanAccessParity: true
    });
    assert.equal(wildcard.decisions[0].reason, "LEGACY_STORED_WILDCARD_PERMISSION");
    for (const [roleId, permission] of [
        ["role-empty", ""],
        ["role-spaces", "   "]
    ]) {
        const atypical = decisions.decideMany({
            interaction: interaction({ roleIds: [roleId] }),
            requests: [{ permission, write: true }],
            legacyCanAccessParity: true
        });
        assert.equal(atypical.decisions[0].reason, "LEGACY_ROLE_UNKNOWN_PERMISSION");
    }

    settings.setValidationChannel("guild-a", "validation");
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: true, updatedBy: "owner"
    });
    const validation = decisions.decideMany({
        interaction: interaction({ validationAccess: true }),
        requests: [{ permission: "validation_unknown" }],
        legacyCanAccessParity: true
    });
    assert.equal(validation.decisions[0].reason, "LEGACY_VALIDATION_UNKNOWN_PERMISSION");
    assert.equal(
        decisions.decideMany({
            interaction: interaction({ roleIds: ["role-unknown"] }),
            requests: [{ permission: "old_unknown" }]
        }).decisions[0].allowed,
        false
    );
});

test("2B.3a isole les guilds et ne partage aucun état entre deux batches", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuilds(isolated.database);
    const { manager, decisions } = reload();
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-scenes",
        permissionKeys: ["scenes"], grantedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: false, updatedBy: "owner"
    });
    manager.setValidationChannelAccess({
        guildId: "guild-b", enabled: false, updatedBy: "owner"
    });
    const requests = [{ permission: "scenes", write: true }];
    const first = decisions.decideMany({
        interaction: interaction({ roleIds: ["role-scenes"] }), requests
    });
    const second = decisions.decideMany({
        interaction: interaction({ guildId: "guild-b", roleIds: ["role-scenes"] }),
        requests
    });
    const third = decisions.decideMany({
        interaction: interaction({ roleIds: ["role-scenes"] }), requests
    });
    assert.equal(first.decisions[0].allowed, true);
    assert.equal(second.decisions[0].allowed, false);
    assert.deepEqual(third, first);
    assert.notEqual(first, third);
    assert.notEqual(first.decisions, third.decisions);
});
