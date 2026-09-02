const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");

const manager = require("../src/v2/managers/StaffPermissionV2Manager");
const bridgeQualification = require(
    "../src/v2/core/services/ValidationBridgeQualificationService"
);
const access = require(
    "../src/v2/core/services/AdministrativePermissionAccessService"
);

const DOMAINS = ["settings", "logs", "automations", "scenes", "modules"];

function interaction({
    guildId = "guild-a",
    userId = "member",
    ownerId = "owner",
    roleIds = ["role-a"],
    administrator = false,
    manageGuild = false,
    validationAccess = false
} = {}) {
    const validationChannel = {
        id: "validation",
        permissionsFor: () => ({ has: () => validationAccess })
    };
    const hasPermission = permission => (
        administrator && permission === PermissionFlagsBits.Administrator
    ) || (
        manageGuild && permission === PermissionFlagsBits.ManageGuild
    );
    return {
        guildId,
        channelId: "validation",
        guild: {
            id: guildId,
            ownerId,
            channels: { cache: new Map([["validation", validationChannel]]) }
        },
        user: { id: userId },
        member: {
            user: { id: userId },
            roles: { cache: new Map(roleIds.map(roleId => [roleId, {}])) },
            permissions: { has: hasPermission }
        },
        memberPermissions: { has: hasPermission }
    };
}

function withFixture({ roles = [], users = [], defaults = [] } = {}, callback) {
    const originals = {
        roles: manager.getPermissionAssignmentsForRoles,
        users: manager.getUserPermissionAssignments,
        defaults: manager.getPermissionDefaults,
        validationFlag: manager.getValidationChannelAccess,
        qualify: bridgeQualification.qualify
    };
    let qualificationCalls = 0;
    manager.getPermissionAssignmentsForRoles = (_guildId, roleIds) =>
        roles.filter(row => roleIds.includes(String(row.roleId)));
    manager.getUserPermissionAssignments = () => users;
    manager.getPermissionDefaults = () => defaults;
    manager.getValidationChannelAccess = () => {
        throw new Error("Validation Bridge must not be queried");
    };
    bridgeQualification.qualify = () => {
        qualificationCalls += 1;
        throw new Error("Validation Bridge must not be qualified");
    };
    try {
        return callback(() => qualificationCalls);
    } finally {
        manager.getPermissionAssignmentsForRoles = originals.roles;
        manager.getUserPermissionAssignments = originals.users;
        manager.getPermissionDefaults = originals.defaults;
        manager.getValidationChannelAccess = originals.validationFlag;
        bridgeQualification.qualify = originals.qualify;
    }
}

test("2C.6a expose une façade administrative strictement read/write", () => {
    const source = fs.readFileSync(path.join(
        __dirname,
        "../src/v2/core/services/AdministrativePermissionAccessService.js"
    ), "utf8");
    assert.doesNotMatch(source, /legacyCanAccessParity|allowValidationBridge/);
    assert.doesNotMatch(source, /ValidationStaffPolicy|StaffCommandAccessService|ManageGuild/);
    assert.deepEqual(Object.keys(access).sort(), ["canRead", "canWrite", "decide"]);

    const denied = access.decide(interaction(), "assets", false);
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, "UNKNOWN_PERMISSION");
    assert.equal(access.decide(interaction(), "*", true).allowed, false);
    assert.equal(access.decide(interaction(), "  ", false).allowed, false);
});

test("2C.6a conserve owner et Administrator comme seules racines", () => {
    withFixture({}, () => {
        for (const domain of DOMAINS) {
            assert.equal(access.canWrite(interaction({ userId: "owner" }), domain), true);
            assert.equal(access.canWrite(interaction({ administrator: true }), domain), true);
            assert.equal(access.canWrite(interaction({ manageGuild: true }), domain), false);
        }
    });
});

test("2C.6a ignore totalement le salon de validation dans tous les domaines", () => {
    withFixture({}, qualificationCalls => {
        const candidate = interaction({ validationAccess: true });
        for (const domain of DOMAINS) {
            assert.equal(access.canWrite(candidate, domain), false, domain);
        }
        assert.equal(qualificationCalls(), 0);
    });
});

test("2C.6a applique user puis role allow et deny", () => {
    const cases = [
        [{ users: [{ permissionKey: "settings", effect: "allow" }] }, true, "USER_ALLOW"],
        [{ users: [{ permissionKey: "settings", effect: "deny" }] }, false, "USER_DENY"],
        [{ roles: [{ roleId: "role-a", permissionKey: "settings", effect: "allow" }] }, true, "ROLE_ALLOW"],
        [{ roles: [{ roleId: "role-a", permissionKey: "settings", effect: "deny" }] }, false, "ROLE_DENY"]
    ];
    for (const [fixture, allowed, reason] of cases) {
        withFixture(fixture, () => {
            const decision = access.decide(interaction(), "settings", true);
            assert.equal(decision.allowed, allowed);
            assert.equal(decision.reason, reason);
        });
    }
});

test("2C.6a applique les defaults et le fallback read_only", () => {
    for (const [effect, allowed, reason] of [
        ["allow", true, "GUILD_DEFAULT_ALLOW"],
        ["deny", false, "GUILD_DEFAULT_DENY"]
    ]) {
        withFixture({ defaults: [{ permissionKey: "logs", effect }] }, () => {
            const decision = access.decide(interaction(), "logs", true);
            assert.equal(decision.allowed, allowed);
            assert.equal(decision.reason, reason);
        });
    }

    withFixture({ users: [{ permissionKey: "read_only", effect: "allow" }] }, () => {
        for (const domain of DOMAINS) {
            assert.equal(access.canRead(interaction(), domain), true, domain);
            assert.equal(access.canWrite(interaction(), domain), false, domain);
        }
    });
});

test("2C.6a ignore wildcard stocké et isole les domaines", () => {
    withFixture({
        users: [
            { permissionKey: "*", effect: "allow" },
            { permissionKey: "settings", effect: "allow" }
        ]
    }, () => {
        assert.equal(access.canWrite(interaction(), "settings"), true);
        for (const domain of DOMAINS.filter(domain => domain !== "settings")) {
            assert.equal(access.canWrite(interaction(), domain), false, domain);
        }
    });
});

test("2C.6b migre Config et Modules sans anticiper Maintenance", () => {
    for (const file of [
        "../src/commands/config/index.js",
        "../src/v2/interactions/settings/GuildModuleSettingsHandler.js"
    ]) {
        const source = fs.readFileSync(path.join(__dirname, file), "utf8");
        assert.match(source, /AdministrativePermissionAccessService/);
    }

    const maintenance = fs.readFileSync(
        path.join(__dirname, "../src/commands/maintenance.js"),
        "utf8"
    );
    assert.doesNotMatch(maintenance, /AdministrativePermissionAccessService/);
});
