const test = require("node:test");
const assert = require("node:assert/strict");
const manager = require("../src/v2/managers/StaffPermissionV2Manager");
const decisionService = require(
    "../src/v2/core/services/StaffPermissionDecisionService"
);

const { REASONS } = decisionService;

function interaction({
    guildId = "guild-a",
    userId = "user-a",
    ownerId = "owner",
    roleIds = ["role-a"],
    administrator = false
} = {}) {
    return {
        guildId,
        guild: { id: guildId, ownerId },
        user: { id: userId },
        member: {
            user: { id: userId },
            roles: { cache: new Map(roleIds.map(roleId => [roleId, {}])) },
            permissions: { has: () => administrator }
        },
        memberPermissions: { has: () => administrator }
    };
}

function withStrictData({ roles = [], users = [], defaults = [] }, callback) {
    const originals = {
        roles: manager.getPermissionAssignmentsForRoles,
        users: manager.getUserPermissionAssignments,
        defaults: manager.getPermissionDefaults,
        validation: manager.getValidationChannelAccess
    };
    const calls = {
        roles: 0,
        users: 0,
        defaults: 0,
        validation: 0,
        guildIds: []
    };
    manager.getPermissionAssignmentsForRoles = (guildId, roleIds) => {
        calls.roles += 1;
        calls.guildIds.push(guildId);
        return roles.filter(row => roleIds.includes(String(row.roleId)));
    };
    manager.getUserPermissionAssignments = guildId => {
        calls.users += 1;
        calls.guildIds.push(guildId);
        return users;
    };
    manager.getPermissionDefaults = guildId => {
        calls.defaults += 1;
        calls.guildIds.push(guildId);
        return defaults;
    };
    manager.getValidationChannelAccess = () => {
        calls.validation += 1;
        throw new Error("bridge de validation strict inattendu");
    };
    try {
        return callback(calls);
    } finally {
        manager.getPermissionAssignmentsForRoles = originals.roles;
        manager.getUserPermissionAssignments = originals.users;
        manager.getPermissionDefaults = originals.defaults;
        manager.getValidationChannelAccess = originals.validation;
    }
}

function resolve(data, options = {}) {
    return withStrictData(data, calls => ({
        snapshot: decisionService.resolveStrictSnapshot(
            interaction(options)
        ),
        calls
    }));
}

function decide(snapshot, permission = "scenes", write = false) {
    return decisionService.evaluateStrictPermission(snapshot, {
        permission,
        write
    });
}

test("les racines strictes court-circuitent toutes les lectures SQLite", () => {
    for (const root of [
        { userId: "owner" },
        { userId: "admin", administrator: true }
    ]) {
        withStrictData({}, calls => {
            const snapshot = decisionService.resolveStrictSnapshot(
                interaction(root)
            );
            const result = decide(snapshot, "permission-inconnue");
            assert.equal(result.allowed, true);
            assert.equal(
                result.reason,
                root.administrator
                    ? REASONS.DISCORD_ADMINISTRATOR
                    : REASONS.GUILD_OWNER
            );
            assert.deepEqual(calls, {
                roles: 0,
                users: 0,
                defaults: 0,
                validation: 0,
                guildIds: []
            });
        });
    }
});

test("le snapshot non-root effectue exactement trois lectures groupées", () => {
    withStrictData({
        roles: [
            { roleId: "role-b", permissionKey: "scenes", effect: "allow" },
            { roleId: "role-a", permissionKey: "scenes", effect: "deny" }
        ],
        users: [{ permissionKey: "phone", effect: null }],
        defaults: [{ permissionKey: "bank", effect: "allow" }]
    }, calls => {
        const snapshot = decisionService.resolveStrictSnapshot(interaction({
            roleIds: ["role-b", "role-a"]
        }));
        assert.equal(calls.roles, 1);
        assert.equal(calls.users, 1);
        assert.equal(calls.defaults, 1);
        assert.equal(calls.validation, 0);
        assert.deepEqual(calls.guildIds, ["guild-a", "guild-a", "guild-a"]);
        assert.deepEqual(
            snapshot.roleAssignmentsByPermission.scenes.map(row => row.roleId),
            ["role-a", "role-b"]
        );
        assert.equal(
            snapshot.userAssignmentsByPermission.phone.effect,
            null
        );
        assert.equal(snapshot.defaultsByPermission.bank.effect, "allow");
    });
});

test("la précédence utilisateur distingue allow, deny et NULL legacy", () => {
    for (const [effect, allowed, legacy] of [
        ["allow", true, false],
        ["deny", false, false],
        [null, true, true]
    ]) {
        const { snapshot } = resolve({
            users: [{ permissionKey: "scenes", effect }]
        });
        const result = decide(snapshot);
        assert.equal(result.allowed, allowed);
        assert.equal(
            result.reason,
            allowed ? REASONS.USER_ALLOW : REASONS.USER_DENY
        );
        assert.deepEqual(result.sources, [{
            type: "USER_PERMISSION",
            permission: "scenes",
            effect,
            legacy
        }]);
    }
});

test("la précédence rôles est deny-first et indépendante de leur ordre", () => {
    const cases = [
        [["allow"], true, REASONS.ROLE_ALLOW],
        [["deny"], false, REASONS.ROLE_DENY],
        [["allow", "deny"], false, REASONS.ROLE_DENY],
        [["allow", "allow"], true, REASONS.ROLE_ALLOW],
        [["deny", "deny"], false, REASONS.ROLE_DENY],
        [[null], true, REASONS.ROLE_ALLOW],
        [[null, "deny"], false, REASONS.ROLE_DENY]
    ];
    for (const [effects, allowed, reason] of cases) {
        const rows = effects.map((effect, index) => ({
            roleId: `role-${effects.length - index}`,
            permissionKey: "scenes",
            effect
        }));
        const { snapshot } = resolve(
            { roles: rows },
            { roleIds: rows.map(row => row.roleId).reverse() }
        );
        const result = decide(snapshot);
        assert.equal(result.allowed, allowed);
        assert.equal(result.reason, reason);
        assert.deepEqual(
            result.sources.map(source => source.roleId),
            [...result.sources.map(source => source.roleId)].sort()
        );
    }
});

test("utilisateur puis rôles puis default définissent la précédence stricte", () => {
    const cases = [
        {
            users: ["allow"], roles: ["deny"], defaults: [],
            allowed: true, reason: REASONS.USER_ALLOW
        },
        {
            users: ["deny"], roles: ["allow"], defaults: [],
            allowed: false, reason: REASONS.USER_DENY
        },
        {
            users: [], roles: ["allow"], defaults: ["deny"],
            allowed: true, reason: REASONS.ROLE_ALLOW
        },
        {
            users: [], roles: ["deny"], defaults: ["allow"],
            allowed: false, reason: REASONS.ROLE_DENY
        },
        {
            users: [], roles: [], defaults: ["allow"],
            allowed: true, reason: REASONS.GUILD_DEFAULT_ALLOW
        },
        {
            users: [], roles: [], defaults: ["deny"],
            allowed: false, reason: REASONS.GUILD_DEFAULT_DENY
        },
        {
            users: [], roles: [], defaults: [],
            allowed: false, reason: REASONS.IMPLICIT_DENY
        }
    ];
    for (const item of cases) {
        const { snapshot } = resolve({
            users: item.users.map(effect => ({
                permissionKey: "scenes", effect
            })),
            roles: item.roles.map((effect, index) => ({
                roleId: `role-${index}`, permissionKey: "scenes", effect
            })),
            defaults: item.defaults.map(effect => ({
                permissionKey: "scenes", effect
            }))
        }, { roleIds: ["role-0"] });
        const result = decide(snapshot);
        assert.equal(result.allowed, item.allowed);
        assert.equal(result.reason, item.reason);
    }
});

test("read_only intervient seulement après absence de décision spécifique", () => {
    const cases = [
        {
            users: [["read_only", "allow"]],
            roles: [["scenes", "deny"]],
            allowed: false, reason: REASONS.ROLE_DENY
        },
        {
            users: [["read_only", "allow"], ["scenes", "deny"]],
            roles: [], allowed: false, reason: REASONS.USER_DENY
        },
        {
            users: [["scenes", "allow"]],
            roles: [["read_only", "allow"]],
            allowed: true, reason: REASONS.USER_ALLOW
        },
        {
            users: [],
            roles: [["read_only", "allow"], ["scenes", "deny"]],
            allowed: false, reason: REASONS.ROLE_DENY
        },
        {
            users: [["scenes", "allow"], ["read_only", "deny"]],
            roles: [], allowed: true, reason: REASONS.USER_ALLOW
        },
        {
            users: [["read_only", "allow"]],
            roles: [], allowed: true, reason: REASONS.READ_ONLY
        },
        {
            users: [["read_only", "deny"]],
            roles: [], allowed: false, reason: REASONS.READ_ONLY_DENY
        }
    ];
    for (const item of cases) {
        const { snapshot } = resolve({
            users: item.users.map(([permissionKey, effect]) => ({
                permissionKey, effect
            })),
            roles: item.roles.map(([permissionKey, effect], index) => ({
                roleId: `role-${index}`, permissionKey, effect
            }))
        }, { roleIds: item.roles.map((_row, index) => `role-${index}`) });
        const result = decide(snapshot);
        assert.equal(result.allowed, item.allowed);
        assert.equal(result.reason, item.reason);
        if ([REASONS.READ_ONLY, REASONS.READ_ONLY_DENY].includes(item.reason)) {
            assert.ok(result.sources.every(source =>
                source.type === "READ_ONLY"
            ));
        }
    }
});

test("read_only respecte sa propre précédence sans récursion", () => {
    const { snapshot } = resolve({
        users: [],
        roles: [{
            roleId: "role-a", permissionKey: "read_only", effect: "allow"
        }],
        defaults: [{ permissionKey: "read_only", effect: "deny" }]
    });
    assert.equal(decide(snapshot).reason, REASONS.READ_ONLY);
    assert.equal(decide(snapshot, "scenes", true).reason, REASONS.IMPLICIT_DENY);
    assert.equal(
        decide(snapshot, "read_only").reason,
        REASONS.ROLE_ALLOW
    );
});

test("unknown, wildcard et valeurs atypiques stockées restent sans autorité", () => {
    const stored = ["unknown", "*", "", "   "];
    const { snapshot } = resolve({
        users: stored.map(permissionKey => ({
            permissionKey, effect: "allow"
        })),
        roles: stored.map((permissionKey, index) => ({
            roleId: `role-${index}`, permissionKey, effect: "allow"
        })),
        defaults: stored.map(permissionKey => ({
            permissionKey, effect: "allow"
        }))
    }, { roleIds: stored.map((_key, index) => `role-${index}`) });
    for (const permission of stored) {
        const result = decide(snapshot, permission);
        assert.equal(result.allowed, false);
        assert.equal(result.reason, REASONS.UNKNOWN_PERMISSION);
    }
});

test("le snapshot et les décisions strictes sont figés et déterministes", () => {
    const data = {
        roles: [
            { roleId: "role-b", permissionKey: "scenes", effect: "allow" },
            { roleId: "role-a", permissionKey: "scenes", effect: "allow" }
        ]
    };
    const first = resolve(data, { roleIds: ["role-b", "role-a"] }).snapshot;
    const second = resolve(data, { roleIds: ["role-a", "role-b"] }).snapshot;
    assert.deepEqual(decide(first), decide(second));
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.roleAssignmentsByPermission), true);
    assert.equal(
        Object.isFrozen(first.roleAssignmentsByPermission.scenes),
        true
    );
    const result = decide(first);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.sources), true);
    assert.ok(result.sources.every(Object.isFrozen));
});

test("le snapshot strict reste isolé par guild", () => {
    const originals = {
        roles: manager.getPermissionAssignmentsForRoles,
        users: manager.getUserPermissionAssignments,
        defaults: manager.getPermissionDefaults
    };
    manager.getPermissionAssignmentsForRoles = () => [];
    manager.getUserPermissionAssignments = guildId => guildId === "guild-a"
        ? [{ permissionKey: "scenes", effect: "allow" }]
        : [{ permissionKey: "scenes", effect: "deny" }];
    manager.getPermissionDefaults = () => [];
    try {
        const guildA = decisionService.resolveStrictSnapshot(interaction());
        const guildB = decisionService.resolveStrictSnapshot(interaction({
            guildId: "guild-b"
        }));
        assert.equal(decide(guildA).reason, REASONS.USER_ALLOW);
        assert.equal(decide(guildB).reason, REASONS.USER_DENY);
    } finally {
        manager.getPermissionAssignmentsForRoles = originals.roles;
        manager.getUserPermissionAssignments = originals.users;
        manager.getPermissionDefaults = originals.defaults;
    }
});

test("le chemin legacy ignore effect et defaults comme avant", () => {
    const originals = {
        roleSources: manager.getPermissionSourcesForRoles,
        users: manager.getUserPermissions,
        validation: manager.getValidationChannelAccess,
        strictRoles: manager.getPermissionAssignmentsForRoles,
        strictUsers: manager.getUserPermissionAssignments,
        defaults: manager.getPermissionDefaults
    };
    manager.getPermissionSourcesForRoles = () => [{
        role_id: "role-a", permission_key: "scenes"
    }];
    manager.getUserPermissions = () => ["unknown", "*", "read_only"];
    manager.getValidationChannelAccess = () => false;
    manager.getPermissionAssignmentsForRoles = () => {
        throw new Error("lecture stricte inattendue");
    };
    manager.getUserPermissionAssignments = () => {
        throw new Error("lecture stricte inattendue");
    };
    manager.getPermissionDefaults = () => {
        throw new Error("defaults legacy inattendus");
    };
    try {
        const current = interaction();
        const scenes = decisionService.decide({
            interaction: current,
            permission: "scenes",
            write: true,
            legacyCanAccessParity: true
        });
        const unknown = decisionService.decide({
            interaction: current,
            permission: "unknown",
            legacyCanAccessParity: true
        });
        assert.equal(scenes.allowed, true);
        assert.equal(unknown.allowed, true);
        assert.deepEqual(
            new Set(decisionService.getGrantedPermissions({
                interaction: current
            })),
            new Set(["scenes", "unknown", "*", "read_only"])
        );
    } finally {
        manager.getPermissionSourcesForRoles = originals.roleSources;
        manager.getUserPermissions = originals.users;
        manager.getValidationChannelAccess = originals.validation;
        manager.getPermissionAssignmentsForRoles = originals.strictRoles;
        manager.getUserPermissionAssignments = originals.strictUsers;
        manager.getPermissionDefaults = originals.defaults;
    }
});
