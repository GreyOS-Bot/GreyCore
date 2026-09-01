const test = require("node:test");
const assert = require("node:assert/strict");
const { PermissionFlagsBits } = require("discord.js");

const manager = require("../src/v2/managers/StaffPermissionV2Manager");
const bridgeService = require(
    "../src/v2/core/services/ValidationBridgeQualificationService"
);
const decisionService = require(
    "../src/v2/core/services/StaffPermissionDecisionService"
);

function interaction({ owner = false, administrator = false } = {}) {
    const userId = owner ? "owner" : "member";
    return {
        guildId: "guild-a",
        guild: {
            id: "guild-a",
            ownerId: "owner",
            channels: { cache: new Map() }
        },
        user: { id: userId },
        member: {
            user: { id: userId },
            roles: { cache: new Map([["role-a", {}]]) },
            permissions: {
                has: permission => administrator
                    && permission === PermissionFlagsBits.Administrator
            }
        },
        memberPermissions: {
            has: permission => administrator
                && permission === PermissionFlagsBits.Administrator
        }
    };
}

function withFixture({
    qualified = true,
    enabled = true,
    roles = [],
    users = [],
    defaults = []
} = {}, callback) {
    const originals = {
        roles: manager.getPermissionAssignmentsForRoles,
        users: manager.getUserPermissionAssignments,
        defaults: manager.getPermissionDefaults,
        qualify: bridgeService.qualify
    };
    const calls = { roles: 0, users: 0, defaults: 0, bridge: 0 };
    manager.getPermissionAssignmentsForRoles = () => {
        calls.roles += 1;
        return roles;
    };
    manager.getUserPermissionAssignments = () => {
        calls.users += 1;
        return users;
    };
    manager.getPermissionDefaults = () => {
        calls.defaults += 1;
        return defaults;
    };
    bridgeService.qualify = ({ guild, member, guildId }) => {
        calls.bridge += 1;
        assert.equal(guild.id, "guild-a");
        assert.equal(member.user.id, "member");
        assert.equal(guildId, "guild-a");
        return Object.freeze({
            enabled,
            qualified: enabled && qualified,
            guildId,
            channelId: enabled ? "validation" : null,
            reason: enabled && qualified ? "QUALIFIED" : "FLAG_DISABLED"
        });
    };
    try {
        return callback(calls);
    } finally {
        manager.getPermissionAssignmentsForRoles = originals.roles;
        manager.getUserPermissionAssignments = originals.users;
        manager.getPermissionDefaults = originals.defaults;
        bridgeService.qualify = originals.qualify;
    }
}

function decide(fixture, permission = "scenes", write = false) {
    return withFixture(fixture, calls => ({
        decision: decisionService.decide({
            interaction: interaction(),
            permission,
            write
        }),
        calls
    }));
}

test("2C.5b accorde le bridge strict seul avec une source minimale", () => {
    const { decision, calls } = decide({ qualified: true });
    assert.deepEqual(decision, {
        allowed: true,
        permission: "scenes",
        mode: "read",
        reason: "VALIDATION_BRIDGE",
        sources: [{
            type: "VALIDATION_BRIDGE",
            permission: "scenes",
            effect: "allow",
            guildId: "guild-a",
            channelId: "validation"
        }]
    });
    assert.equal(Object.isFrozen(decision), true);
    assert.equal(Object.isFrozen(decision.sources), true);
    assert.equal(Object.isFrozen(decision.sources[0]), true);
    assert.deepEqual(calls, { roles: 1, users: 1, defaults: 1, bridge: 1 });
});

test("2C.5b conserve user deny et user allow au-dessus du bridge", () => {
    const denied = decide({
        users: [{ permissionKey: "scenes", effect: "deny" }]
    }).decision;
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, "USER_DENY");
    const allowed = decide({
        users: [{ permissionKey: "scenes", effect: "allow" }]
    }).decision;
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.reason, "USER_ALLOW");
    assert.equal(allowed.sources.some(source =>
        source.type === "VALIDATION_BRIDGE"), false);
});

test("2C.5b conserve role deny et role allow au niveau du bridge", () => {
    const denied = decide({ roles: [{
        roleId: "role-a", permissionKey: "scenes", effect: "deny"
    }] }).decision;
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, "ROLE_DENY");
    assert.equal(denied.sources.length, 1);

    const allowed = decide({ roles: [
        { roleId: "role-z", permissionKey: "scenes", effect: "allow" },
        { roleId: "role-a", permissionKey: "scenes", effect: null }
    ] }).decision;
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.reason, "ROLE_ALLOW");
    assert.deepEqual(allowed.sources.map(source => source.type), [
        "ROLE_PERMISSION",
        "ROLE_PERMISSION",
        "VALIDATION_BRIDGE"
    ]);
    assert.deepEqual(allowed.sources.slice(0, 2).map(source => source.roleId), [
        "role-a",
        "role-z"
    ]);
});

test("2C.5b place le bridge au-dessus des defaults et de read_only", () => {
    for (const effect of ["deny", "allow"]) {
        const result = decide({ defaults: [{
            permissionKey: "scenes", effect
        }] }).decision;
        assert.equal(result.allowed, true);
        assert.equal(result.reason, "VALIDATION_BRIDGE");
    }
    const readOnly = decide({}, "read_only", true).decision;
    assert.equal(readOnly.allowed, true);
    assert.equal(readOnly.reason, "VALIDATION_BRIDGE");
});

test("2C.5b refuse unknown, wildcard et valeurs atypiques avant le bridge", () => {
    for (const permission of ["unknown", "*", "", "   "]) {
        const result = decide({}, permission).decision;
        assert.equal(result.allowed, false);
        assert.equal(result.reason, "UNKNOWN_PERMISSION");
        assert.deepEqual(result.sources, []);
    }
});

test("2C.5b accorde les consommateurs stricts Assets et Modules", () => {
    for (const [permission, write] of [
        ["assets", false],
        ["assets", true],
        ["modules", true]
    ]) {
        const result = decide({}, permission, write).decision;
        assert.equal(result.allowed, true);
        assert.equal(result.reason, "VALIDATION_BRIDGE");
        assert.equal(result.mode, write ? "write" : "read");
    }
    assert.equal(decide({
        users: [{ permissionKey: "assets", effect: "deny" }]
    }, "assets", true).decision.reason, "USER_DENY");
    assert.equal(decide({ roles: [{
        roleId: "role-a", permissionKey: "assets", effect: "deny"
    }] }, "assets", true).decision.reason, "ROLE_DENY");
});

test("2C.5b partage une qualification unique dans decideMany", () => {
    withFixture({}, calls => {
        const result = decisionService.decideMany({
            interaction: interaction(),
            requests: [
                { permission: "assets", write: false },
                { permission: "assets", write: true },
                { permission: "modules", write: true },
                { permission: "scenes", write: false }
            ]
        });
        assert.deepEqual(result.decisions.map(item => item.reason), [
            "VALIDATION_BRIDGE",
            "VALIDATION_BRIDGE",
            "VALIDATION_BRIDGE",
            "VALIDATION_BRIDGE"
        ]);
        assert.deepEqual(calls, {
            roles: 1,
            users: 1,
            defaults: 1,
            bridge: 1
        });
    });
});

test("2C.5b court-circuite owner et Administrator avant le bridge", () => {
    withFixture({}, calls => {
        const owner = decisionService.decide({
            interaction: interaction({ owner: true }),
            permission: "unknown"
        });
        const admin = decisionService.decide({
            interaction: interaction({ administrator: true }),
            permission: "unknown"
        });
        assert.equal(owner.reason, "GUILD_OWNER");
        assert.equal(admin.reason, "DISCORD_ADMINISTRATOR");
        assert.deepEqual(calls, {
            roles: 0,
            users: 0,
            defaults: 0,
            bridge: 0
        });
    });
});

test("2C.5b laisse flag OFF et non-qualification suivre le strict normal", () => {
    assert.equal(decide({ enabled: false }).decision.reason, "IMPLICIT_DENY");
    assert.equal(decide({ qualified: false }).decision.reason, "IMPLICIT_DENY");
    assert.equal(decide({
        qualified: false,
        defaults: [{ permissionKey: "scenes", effect: "allow" }]
    }).decision.reason, "GUILD_DEFAULT_ALLOW");
});

test("2C.5b maintient une séparation complète entre strict et legacy", () => {
    withFixture({}, calls => {
        const strict = decisionService.decide({
            interaction: interaction(),
            permission: "scenes"
        });
        assert.equal(strict.reason, "VALIDATION_BRIDGE");
        const bridgeCalls = calls.bridge;
        const legacy = decisionService.decide({
            interaction: interaction(),
            permission: "scenes",
            legacyCanAccessParity: true
        });
        assert.equal(calls.bridge, bridgeCalls);
        assert.notEqual(legacy.reason, "VALIDATION_BRIDGE");
    });
});
