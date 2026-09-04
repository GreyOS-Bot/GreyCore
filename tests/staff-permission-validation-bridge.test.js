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

function decide(
    fixture,
    permission = "characters",
    write = false,
    allowValidationBridge = true
) {
    return withFixture(fixture, calls => ({
        decision: decisionService.decide({
            interaction: interaction(),
            permission,
            write,
            allowValidationBridge
        }),
        calls
    }));
}

test("2C.5b2 accorde uniquement characters avec opt-in explicite", () => {
    const { decision, calls } = decide({ qualified: true });
    assert.deepEqual(decision, {
        allowed: true,
        permission: "characters",
        mode: "read",
        reason: "VALIDATION_BRIDGE",
        sources: [{
            type: "VALIDATION_BRIDGE",
            permission: "characters",
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

test("2C.5b2 désactive le bridge par défaut et hors characters", () => {
    withFixture({}, calls => {
        for (const value of [undefined, false]) {
            const options = {
                interaction: interaction(),
                permission: "characters",
                write: false
            };
            if (value !== undefined) options.allowValidationBridge = value;
            assert.equal(
                decisionService.decide(options).reason,
                "IMPLICIT_DENY"
            );
        }
        assert.equal(calls.bridge, 0);
    });

    for (const [permission, write] of [
        ["assets", false], ["assets", true], ["modules", true],
        ["scenes", true], ["settings", true], ["automations", true],
        ["read_only", false]
    ]) {
        const result = decide({}, permission, write, true);
        assert.equal(result.decision.allowed, false);
        assert.equal(result.decision.reason, "IMPLICIT_DENY");
        assert.equal(result.calls.bridge, 0);
    }
});

test("2C.5b2 conserve user deny et user allow au-dessus du bridge", () => {
    const denied = decide({
        users: [{ permissionKey: "characters", effect: "deny" }]
    }).decision;
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, "USER_DENY");
    const allowed = decide({
        users: [{ permissionKey: "characters", effect: "allow" }]
    }).decision;
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.reason, "USER_ALLOW");
    assert.equal(allowed.sources.some(source =>
        source.type === "VALIDATION_BRIDGE"), false);
});

test("2C.5b2 conserve role deny et role allow au niveau du bridge", () => {
    const denied = decide({ roles: [{
        roleId: "role-a", permissionKey: "characters", effect: "deny"
    }] }).decision;
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, "ROLE_DENY");
    assert.equal(denied.sources.length, 1);

    const allowed = decide({ roles: [
        { roleId: "role-z", permissionKey: "characters", effect: "allow" },
        { roleId: "role-a", permissionKey: "characters", effect: null }
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

test("2C.5b2 place le bridge characters au-dessus des defaults et read_only", () => {
    for (const effect of ["deny", "allow"]) {
        const result = decide({ defaults: [{
            permissionKey: "characters", effect
        }] }).decision;
        assert.equal(result.allowed, true);
        assert.equal(result.reason, "VALIDATION_BRIDGE");
    }
    const readOnly = decide({ roles: [{
        roleId: "role-a", permissionKey: "read_only", effect: "allow"
    }] }).decision;
    assert.equal(readOnly.reason, "VALIDATION_BRIDGE");
});

test("2C.5b2 refuse unknown et wildcard sans qualifier le bridge", () => {
    for (const permission of ["unknown", "*", "", "   "]) {
        const result = decide({}, permission, false, true);
        assert.equal(result.decision.allowed, false);
        assert.equal(result.decision.reason, "UNKNOWN_PERMISSION");
        assert.deepEqual(result.decision.sources, []);
        assert.equal(result.calls.bridge, 0);
    }
});

test("2C.5b2 isole un batch mixte et qualifie une seule fois", () => {
    withFixture({}, calls => {
        const result = decisionService.decideMany({
            interaction: interaction(),
            requests: [
                { permission: "characters", write: true, allowValidationBridge: true },
                { permission: "assets", write: true },
                { permission: "modules", write: true }
            ]
        });
        assert.deepEqual(result.decisions.map(item => item.reason), [
            "VALIDATION_BRIDGE",
            "IMPLICIT_DENY",
            "IMPLICIT_DENY"
        ]);
        assert.deepEqual(calls, {
            roles: 1,
            users: 1,
            defaults: 1,
            bridge: 1
        });
    });
});

test("2C.5b2 ne qualifie jamais un batch sans opt-in éligible", () => {
    withFixture({}, calls => {
        const requests = Array.from({ length: 10 }, (_, index) => ({
            permission: index === 0 ? "characters" : "scenes",
            write: index % 2 === 0
        }));
        decisionService.decideMany({ interaction: interaction(), requests });
        assert.equal(calls.bridge, 0);
    });
});

test("2C.5b2 partage une qualification entre plusieurs requests characters", () => {
    withFixture({}, calls => {
        const result = decisionService.decideMany({
            interaction: interaction(),
            requests: [
                { permission: "characters", write: false, allowValidationBridge: true },
                { permission: "characters", write: true, allowValidationBridge: true }
            ]
        });
        assert.deepEqual(result.decisions.map(item => item.reason), [
            "VALIDATION_BRIDGE", "VALIDATION_BRIDGE"
        ]);
        assert.equal(calls.bridge, 1);
    });
});

test("2C.5b2 court-circuite owner et Administrator avant le bridge", () => {
    withFixture({}, calls => {
        const owner = decisionService.decide({
            interaction: interaction({ owner: true }),
            permission: "characters",
            allowValidationBridge: true
        });
        const admin = decisionService.decide({
            interaction: interaction({ administrator: true }),
            permission: "characters",
            allowValidationBridge: true
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

test("2C.5b2 laisse flag OFF et non-qualification suivre le strict normal", () => {
    assert.equal(decide({ enabled: false }).decision.reason, "IMPLICIT_DENY");
    assert.equal(decide({ qualified: false }).decision.reason, "IMPLICIT_DENY");
    assert.equal(decide({
        qualified: false,
        defaults: [{ permissionKey: "characters", effect: "allow" }]
    }).decision.reason, "GUILD_DEFAULT_ALLOW");
});

test("2C.5b2 maintient une séparation complète entre strict et legacy", () => {
    withFixture({}, calls => {
        const strict = decisionService.decide({
            interaction: interaction(),
            permission: "characters",
            allowValidationBridge: true
        });
        assert.equal(strict.reason, "VALIDATION_BRIDGE");
        const bridgeCalls = calls.bridge;
        const legacy = decisionService.decide({
            interaction: interaction(),
            permission: "characters",
            allowValidationBridge: true,
            legacyCanAccessParity: true
        });
        assert.equal(calls.bridge, bridgeCalls);
        assert.notEqual(legacy.reason, "VALIDATION_BRIDGE");
    });
});
