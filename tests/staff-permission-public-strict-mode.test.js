const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const manager = require("../src/v2/managers/StaffPermissionV2Manager");
const validationPolicy = require(
    "../src/v2/core/policies/ValidationStaffPolicy"
);
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

function withFixture({
    roles = [],
    users = [],
    defaults = [],
    legacyRoles,
    legacyUsers,
    validationAccess = false,
    validationStaff = false
} = {}, callback) {
    const originals = {
        strictRoles: manager.getPermissionAssignmentsForRoles,
        strictUsers: manager.getUserPermissionAssignments,
        defaults: manager.getPermissionDefaults,
        legacyRoles: manager.getPermissionSourcesForRoles,
        legacyUsers: manager.getUserPermissions,
        validationAccess: manager.getValidationChannelAccess,
        validationStaff: validationPolicy.canManageServerTools
    };
    const calls = {
        strictRoles: 0,
        strictUsers: 0,
        defaults: 0,
        legacyRoles: 0,
        legacyUsers: 0,
        validationAccess: 0,
        validationStaff: 0
    };
    manager.getPermissionAssignmentsForRoles = (_guildId, roleIds) => {
        calls.strictRoles += 1;
        return roles.filter(row => roleIds.includes(String(row.roleId)));
    };
    manager.getUserPermissionAssignments = () => {
        calls.strictUsers += 1;
        return users;
    };
    manager.getPermissionDefaults = () => {
        calls.defaults += 1;
        return defaults;
    };
    manager.getPermissionSourcesForRoles = (_guildId, roleIds) => {
        calls.legacyRoles += 1;
        const rows = legacyRoles || roles.map(row => ({
            role_id: String(row.roleId),
            permission_key: row.permissionKey
        }));
        return rows.filter(row => roleIds.includes(String(row.role_id)));
    };
    manager.getUserPermissions = () => {
        calls.legacyUsers += 1;
        return legacyUsers || users.map(row => row.permissionKey);
    };
    manager.getValidationChannelAccess = () => {
        calls.validationAccess += 1;
        return validationAccess;
    };
    validationPolicy.canManageServerTools = () => {
        calls.validationStaff += 1;
        return validationStaff;
    };
    try {
        return callback(calls);
    } finally {
        manager.getPermissionAssignmentsForRoles = originals.strictRoles;
        manager.getUserPermissionAssignments = originals.strictUsers;
        manager.getPermissionDefaults = originals.defaults;
        manager.getPermissionSourcesForRoles = originals.legacyRoles;
        manager.getUserPermissions = originals.legacyUsers;
        manager.getValidationChannelAccess = originals.validationAccess;
        validationPolicy.canManageServerTools = originals.validationStaff;
    }
}

function publicDecision(fixture, options = {}) {
    return withFixture(fixture, calls => ({
        result: decisionService.decide({
            interaction: interaction(options.interaction),
            permission: options.permission === undefined
                ? "scenes"
                : options.permission,
            write: options.write === true,
            ...(options.legacy === true
                ? { legacyCanAccessParity: true }
                : {})
        }),
        calls
    }));
}

test("decide public expose toutes les reasons strictes de précédence", () => {
    const cases = [
        {
            fixture: { users: [{ permissionKey: "scenes", effect: "deny" }] },
            allowed: false, reason: REASONS.USER_DENY
        },
        {
            fixture: { users: [{ permissionKey: "scenes", effect: "allow" }] },
            allowed: true, reason: REASONS.USER_ALLOW
        },
        {
            fixture: { roles: [{
                roleId: "role-a", permissionKey: "scenes", effect: "deny"
            }] },
            allowed: false, reason: REASONS.ROLE_DENY
        },
        {
            fixture: { roles: [{
                roleId: "role-a", permissionKey: "scenes", effect: "allow"
            }] },
            allowed: true, reason: REASONS.ROLE_ALLOW
        },
        {
            fixture: { defaults: [{
                permissionKey: "scenes", effect: "deny"
            }] },
            allowed: false, reason: REASONS.GUILD_DEFAULT_DENY
        },
        {
            fixture: { defaults: [{
                permissionKey: "scenes", effect: "allow"
            }] },
            allowed: true, reason: REASONS.GUILD_DEFAULT_ALLOW
        },
        {
            fixture: { users: [{
                permissionKey: "read_only", effect: "allow"
            }] },
            allowed: true, reason: REASONS.READ_ONLY
        },
        {
            fixture: { users: [{
                permissionKey: "read_only", effect: "deny"
            }] },
            allowed: false, reason: REASONS.READ_ONLY_DENY
        },
        {
            fixture: {}, permission: "unknown",
            allowed: false, reason: REASONS.UNKNOWN_PERMISSION
        },
        {
            fixture: {}, allowed: false, reason: REASONS.IMPLICIT_DENY
        }
    ];
    for (const item of cases) {
        const { result } = publicDecision(item.fixture, {
            permission: item.permission
        });
        assert.equal(result.allowed, item.allowed);
        assert.equal(result.reason, item.reason);
    }
});

test("deny et defaults divergent explicitement entre strict et legacy", () => {
    const deniedRole = {
        roles: [{
            roleId: "role-a", permissionKey: "scenes", effect: "deny"
        }]
    };
    const strictDeny = publicDecision(deniedRole).result;
    const legacyDeny = publicDecision(deniedRole, { legacy: true }).result;
    assert.equal(strictDeny.allowed, false);
    assert.equal(strictDeny.reason, REASONS.ROLE_DENY);
    assert.equal(legacyDeny.allowed, true);
    assert.equal(legacyDeny.reason, REASONS.ROLE_PERMISSION);

    for (const effect of ["allow", "deny"]) {
        const fixture = {
            defaults: [{ permissionKey: "scenes", effect }]
        };
        const strict = publicDecision(fixture).result;
        const legacy = publicDecision(fixture, { legacy: true }).result;
        assert.equal(strict.allowed, effect === "allow");
        assert.equal(
            strict.reason,
            effect === "allow"
                ? REASONS.GUILD_DEFAULT_ALLOW
                : REASONS.GUILD_DEFAULT_DENY
        );
        assert.equal(legacy.allowed, false);
        assert.equal(legacy.reason, REASONS.NO_PERMISSION);
    }
});

test("NULL reste un allow legacy explicite dans les deux modes", () => {
    const fixture = {
        users: [{ permissionKey: "scenes", effect: null }]
    };
    const strict = publicDecision(fixture).result;
    const legacy = publicDecision(fixture, { legacy: true }).result;
    assert.equal(strict.allowed, true);
    assert.equal(strict.reason, REASONS.USER_ALLOW);
    assert.equal(strict.sources[0].effect, null);
    assert.equal(strict.sources[0].legacy, true);
    assert.equal(legacy.allowed, true);
    assert.equal(legacy.reason, REASONS.USER_PERMISSION);
});

test("unknown, wildcard, validation et read_only unknown restent isolés", () => {
    const compatibility = {
        legacyUsers: ["unknown", "*", "read_only"],
        validationAccess: true,
        validationStaff: true
    };
    for (const permission of ["unknown", "*", "", "   "]) {
        const strict = publicDecision(compatibility, { permission }).result;
        assert.equal(strict.allowed, false);
        assert.equal(strict.reason, REASONS.UNKNOWN_PERMISSION);
    }

    const legacyUnknown = publicDecision(compatibility, {
        permission: "unknown",
        legacy: true
    }).result;
    assert.equal(legacyUnknown.allowed, true);
    assert.equal(
        legacyUnknown.reason,
        REASONS.LEGACY_VALIDATION_UNKNOWN_PERMISSION
    );

    const validationOnly = {
        validationAccess: true,
        validationStaff: true
    };
    assert.equal(publicDecision(validationOnly).result.reason, REASONS.IMPLICIT_DENY);
    assert.equal(
        publicDecision(validationOnly, { legacy: true }).result.reason,
        REASONS.VALIDATION_LEGACY_ACCESS
    );

    const readOnlyOnly = { legacyUsers: ["read_only"] };
    assert.equal(
        publicDecision(readOnlyOnly, { permission: "unknown" }).result.reason,
        REASONS.UNKNOWN_PERMISSION
    );
    assert.equal(
        publicDecision(readOnlyOnly, {
            permission: "unknown",
            legacy: true
        }).result.reason,
        REASONS.LEGACY_READ_ONLY_UNKNOWN_PERMISSION
    );
});

test("le branchement public conserve la matrice read_only stricte", () => {
    const specificDeny = {
        roles: [{
            roleId: "role-a", permissionKey: "scenes", effect: "deny"
        }],
        users: [{ permissionKey: "read_only", effect: "allow" }]
    };
    assert.equal(
        publicDecision(specificDeny).result.reason,
        REASONS.ROLE_DENY
    );
    const fallback = {
        users: [{ permissionKey: "read_only", effect: "allow" }]
    };
    assert.equal(publicDecision(fallback).result.reason, REASONS.READ_ONLY);
    assert.equal(
        publicDecision(fallback, { write: true }).result.reason,
        REASONS.IMPLICIT_DENY
    );
});

test("owner et Administrator court-circuitent les deux moteurs publics", () => {
    for (const legacy of [false, true]) {
        for (const root of [
            { userId: "owner", reason: REASONS.GUILD_OWNER },
            {
                userId: "admin",
                administrator: true,
                reason: REASONS.DISCORD_ADMINISTRATOR
            }
        ]) {
            const { result, calls } = publicDecision({}, {
                legacy,
                permission: "unknown",
                interaction: root
            });
            assert.equal(result.allowed, true);
            assert.equal(result.reason, root.reason);
            assert.equal(
                Object.values(calls).reduce((sum, count) => sum + count, 0),
                0
            );
        }
    }
});

test("decide et decideMany donnent la même décision dans chaque mode", () => {
    const fixture = {
        roles: [{
            roleId: "role-a", permissionKey: "scenes", effect: "deny"
        }]
    };
    for (const legacy of [false, true]) {
        withFixture(fixture, () => {
            const current = interaction();
            const single = decisionService.decide({
                interaction: current,
                permission: "scenes",
                legacyCanAccessParity: legacy
            });
            const batch = decisionService.decideMany({
                interaction: current,
                requests: [{ permission: "scenes", write: false }],
                legacyCanAccessParity: legacy
            }).decisions[0];
            assert.deepEqual(single, batch);
        });
    }
});

test("un batch strict partage un snapshot et un mode global", () => {
    withFixture({
        users: [{ permissionKey: "phone", effect: "allow" }],
        roles: [{
            roleId: "role-a", permissionKey: "scenes", effect: "deny"
        }],
        defaults: [{ permissionKey: "bank", effect: "allow" }]
    }, calls => {
        const result = decisionService.decideMany({
            interaction: interaction(),
            requests: [
                { permission: "scenes", write: false },
                { permission: "phone", write: true },
                { permission: "bank", write: false },
                { permission: "unknown", write: false }
            ]
        });
        assert.deepEqual(result.decisions.map(item => item.reason), [
            REASONS.ROLE_DENY,
            REASONS.USER_ALLOW,
            REASONS.GUILD_DEFAULT_ALLOW,
            REASONS.UNKNOWN_PERMISSION
        ]);
        assert.deepEqual(calls, {
            strictRoles: 1,
            strictUsers: 1,
            defaults: 1,
            legacyRoles: 0,
            legacyUsers: 0,
            validationAccess: 0,
            validationStaff: 0
        });
    });
});

test("un batch legacy conserve son snapshot historique optimisé", () => {
    withFixture({
        legacyRoles: [{ role_id: "role-a", permission_key: "scenes" }],
        legacyUsers: ["phone"]
    }, calls => {
        decisionService.decideMany({
            interaction: interaction(),
            requests: [
                { permission: "scenes", write: false },
                { permission: "phone", write: true }
            ],
            legacyCanAccessParity: true
        });
        assert.deepEqual(calls, {
            strictRoles: 0,
            strictUsers: 0,
            defaults: 0,
            legacyRoles: 1,
            legacyUsers: 1,
            validationAccess: 1,
            validationStaff: 0
        });
    });
});

test("les consommateurs historiques restent legacy et les domaines migrés utilisent le strict", () => {
    const policyPath = path.join(
        __dirname,
        "../src/v2/core/policies/StaffPermissionPolicy.js"
    );
    const centerPath = path.join(
        __dirname,
        "../src/v2/pages/staff/StaffCenterPage.js"
    );
    const policySource = fs.readFileSync(policyPath, "utf8");
    const centerSource = fs.readFileSync(centerPath, "utf8");
    assert.match(
        policySource,
        /decisionService\.decide\([\s\S]*legacyCanAccessParity:\s*true/
    );
    assert.match(
        centerSource,
        /decisionService\.decideMany\([\s\S]*legacyCanAccessParity:\s*true/
    );
    assert.match(
        centerSource,
        /decisionService\.decide\([\s\S]*permission:\s*"assets"[\s\S]*write:\s*false/
    );

    const callers = listJavaScriptFiles(path.join(__dirname, "../src"))
        .filter(file => !file.endsWith("StaffPermissionDecisionService.js"))
        .filter(file => {
            const source = fs.readFileSync(file, "utf8");
            return /decisionService\.(?:decide|decideMany)\(/.test(source);
        })
        .map(file => path.relative(path.join(__dirname, ".."), file))
        .sort();
    assert.deepEqual(callers, [
        path.join("src", "commands", "blocage", "index.js"),
        path.join("src", "v2", "core", "policies", "StaffPermissionPolicy.js"),
        path.join("src", "v2", "core", "services", "AdministrativePermissionAccessService.js"),
        path.join("src", "v2", "core", "services", "ValidationPermissionAccessService.js"),
        path.join("src", "v2", "pages", "staff", "StaffAssetsPage.js"),
        path.join("src", "v2", "pages", "staff", "StaffCenterPage.js"),
        path.join("src", "v2", "pages", "staff", "StaffEntitiesPage.js"),
        path.join("src", "v2", "pages", "staff", "StaffSectionPage.js"),
        path.join("src", "v2", "router", "buttons", "StaffEntityRouter.js"),
        path.join("src", "v2", "router", "buttons", "StaffRouter.js"),
        path.join("src", "v2", "router", "modals", "StaffEntityModalRouter.js"),
        path.join("src", "v2", "router", "selects", "StaffEntitySelectRouter.js"),
        path.join("src", "v2", "router", "selects", "StaffSelectRouter.js")
    ].sort());
});

function listJavaScriptFiles(directory) {
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...listJavaScriptFiles(target));
        else if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
    }
    return files;
}
