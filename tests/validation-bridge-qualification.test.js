const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");

const staffPermissionManager = require(
    "../src/v2/managers/StaffPermissionV2Manager"
);
const guildSettingsManager = require(
    "../src/v2/managers/GuildSettingsV2Manager"
);
const service = require(
    "../src/v2/core/services/ValidationBridgeQualificationService"
);

function fixture({
    enabled = true,
    channelId = "validation",
    cached = true,
    member = { id: "member" },
    viewChannel = true,
    manageGuild = false,
    permissionsFor = true,
    permissionResult = true
} = {}) {
    const calls = {
        setting: 0,
        channelId: 0,
        permissionsFor: 0,
        fetch: 0
    };
    const originalSetting = staffPermissionManager.getValidationChannelAccess;
    const originalChannel = guildSettingsManager.getValidationChannelId;
    staffPermissionManager.getValidationChannelAccess = () => {
        calls.setting += 1;
        return enabled;
    };
    guildSettingsManager.getValidationChannelId = () => {
        calls.channelId += 1;
        return channelId;
    };
    const resolvedMember = member && {
        ...member,
        permissions: {
            has: () => manageGuild
        }
    };
    const channel = {
        fetch: () => {
            calls.fetch += 1;
            throw new Error("network fetch forbidden");
        },
        ...(permissionsFor ? {
            permissionsFor: candidate => {
                calls.permissionsFor += 1;
                assert.equal(candidate, resolvedMember);
                return permissionResult
                    ? {
                        has: permission => {
                            assert.equal(
                                permission,
                                PermissionFlagsBits.ViewChannel
                            );
                            return viewChannel;
                        }
                    }
                    : null;
            }
        } : {})
    };
    const guild = {
        id: "guild-a",
        channels: {
            cache: new Map(cached ? [[String(channelId), channel]] : []),
            fetch: () => {
                calls.fetch += 1;
                throw new Error("network fetch forbidden");
            }
        }
    };
    return {
        calls,
        guild,
        member: resolvedMember,
        restore() {
            staffPermissionManager.getValidationChannelAccess = originalSetting;
            guildSettingsManager.getValidationChannelId = originalChannel;
        }
    };
}

function qualify(options = {}) {
    const current = fixture(options);
    try {
        return {
            result: service.qualify({
                guild: current.guild,
                member: current.member,
                guildId: current.guild.id
            }),
            calls: current.calls
        };
    } finally {
        current.restore();
    }
}

test("2C.5a court-circuite Discord lorsque le flag est désactivé", () => {
    const { result, calls } = qualify({ enabled: false, manageGuild: true });
    assert.deepEqual(result, {
        enabled: false,
        qualified: false,
        guildId: "guild-a",
        channelId: null,
        reason: "FLAG_DISABLED"
    });
    assert.deepEqual(calls, {
        setting: 1,
        channelId: 0,
        permissionsFor: 0,
        fetch: 0
    });
    assert.equal(Object.isFrozen(result), true);
});

test("2C.5a traite l'absence de réglage comme active via le manager existant", () => {
    const repositorySource = fs.readFileSync(path.join(
        __dirname,
        "../src/v2/repositories/StaffPermissionRepository.js"
    ), "utf8");
    assert.match(
        repositorySource,
        /getValidationChannelAccess[\s\S]*return row\s*\?[\s\S]*:\s*true;/
    );
    const { result } = qualify({ enabled: true });
    assert.equal(result.enabled, true);
    assert.equal(result.reason, "QUALIFIED");
});

test("2C.5a échoue fermé sans salon configuré ou sans salon en cache", () => {
    assert.equal(qualify({ channelId: null }).result.reason,
        "NO_VALIDATION_CHANNEL");
    const missing = qualify({ cached: false });
    assert.equal(missing.result.reason, "CHANNEL_NOT_CACHED");
    assert.equal(missing.calls.permissionsFor, 0);
    assert.equal(missing.calls.fetch, 0);
});

test("2C.5a échoue fermé sans membre ou primitive permissionsFor", () => {
    assert.equal(qualify({ member: null }).result.reason,
        "MEMBER_UNAVAILABLE");
    assert.equal(qualify({ permissionsFor: false }).result.reason,
        "PERMISSIONS_UNAVAILABLE");
    assert.equal(qualify({ permissionResult: false }).result.reason,
        "PERMISSIONS_UNAVAILABLE");
});

test("2C.5a utilise exclusivement ViewChannel comme qualification", () => {
    const denied = qualify({ viewChannel: false });
    assert.equal(denied.result.qualified, false);
    assert.equal(denied.result.reason, "NO_VIEW_CHANNEL");
    const allowed = qualify({ viewChannel: true });
    assert.equal(allowed.result.qualified, true);
    assert.equal(allowed.result.reason, "QUALIFIED");
    assert.equal(allowed.calls.permissionsFor, 1);
});

test("2C.5a n'accorde aucune autorité propre à ManageGuild", () => {
    assert.equal(qualify({
        manageGuild: true,
        viewChannel: false
    }).result.qualified, false);
    assert.equal(qualify({
        manageGuild: true,
        viewChannel: true
    }).result.qualified, true);
    assert.equal(qualify({
        enabled: false,
        manageGuild: true,
        viewChannel: true
    }).result.reason, "FLAG_DISABLED");
});

test("2C.5a isole strictement le cache de la guild", () => {
    const current = fixture({ cached: false });
    current.guild.client = {
        channels: {
            cache: new Map([["validation", {
                permissionsFor: () => ({ has: () => true })
            }]])
        }
    };
    try {
        const result = service.qualify({
            guild: current.guild,
            member: current.member
        });
        assert.equal(result.reason, "CHANNEL_NOT_CACHED");
        assert.equal(current.calls.fetch, 0);
    } finally {
        current.restore();
    }
});

test("2C.5a ne dépend d'aucune policy legacy ou permission GreyCore", () => {
    const source = fs.readFileSync(path.join(
        __dirname,
        "../src/v2/core/services/ValidationBridgeQualificationService.js"
    ), "utf8");
    assert.doesNotMatch(source, /ValidationStaffPolicy|StaffCommandAccessService/);
    assert.doesNotMatch(source, /GuildManagementPolicy|ManageGuild/);
    assert.doesNotMatch(source, /canManageServerTools|canReview/);
    assert.doesNotMatch(source, /client\.channels|\.fetch\s*\(/);
    assert.doesNotMatch(source, /permission\s*:|write\s*:|legacyCanAccessParity/);
});
