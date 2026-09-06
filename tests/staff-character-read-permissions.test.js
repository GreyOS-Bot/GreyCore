const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

const policyPath = require.resolve("../src/v2/core/policies/StaffPermissionPolicy");
const decisionPath = require.resolve("../src/v2/core/services/StaffPermissionDecisionService");
const validationAccessPath = require.resolve(
    "../src/v2/core/services/ValidationPermissionAccessService"
);
const buttonRouterPath = require.resolve("../src/v2/router/buttons/StaffRouter");
const selectRouterPath = require.resolve("../src/v2/router/selects/StaffSelectRouter");

const BUTTON_IDS = [
    "v2_staff_characters_pending",
    "v2_staff_characters_roster",
    "v2_staff_characters_roster_page:1",
    "v2_staff_characters_statistics_global",
    "v2_staff_characters_statistics_user",
    "v2_staff_characters_statistics_users_page:1",
    "v2_staff_characters_genders",
    "v2_staff_character_genders_page:1",
    "v2_staff_character_gender_quick:0",
    "v2_staff_characters_users"
];

const SELECT_IDS = [
    "v2_staff_characters_user_select",
    "v2_staff_characters_statistics_user_select",
    "v2_staff_character_gender_select:0"
];

function deniedInteraction(customId) {
    let replies = 0;
    return {
        customId,
        guildId: "guild",
        user: { id: "member" },
        isButton: () => BUTTON_IDS.includes(customId),
        reply: async () => { replies += 1; },
        followUp: async () => { replies += 1; },
        get replies() { return replies; }
    };
}

test("2B.2b revalide chaque consultation Personnages avec characters write:false", async context => {
    const previousPolicy = require.cache[policyPath];
    const previousDecision = require.cache[decisionPath];
    const previousValidationAccess = require.cache[validationAccessPath];
    const calls = [];
    require.cache[policyPath] = {
        id: policyPath,
        filename: policyPath,
        loaded: true,
        exports: {
            canAccess: (interaction, permission, options) => {
                calls.push({ customId: interaction.customId, permission, options });
                return false;
            }
        }
    };
    require.cache[decisionPath] = {
        id: decisionPath,
        filename: decisionPath,
        loaded: true,
        exports: {
            decide: options => {
                calls.push({
                    customId: options.interaction.customId,
                    permission: options.permission,
                    options: { write: options.write }
                });
                return { allowed: false };
            }
        }
    };
    require.cache[validationAccessPath] = {
        id: validationAccessPath,
        filename: validationAccessPath,
        loaded: true,
        exports: {
            canRead: interaction => {
                calls.push({
                    customId: interaction.customId,
                    permission: "characters",
                    options: { write: false, allowValidationBridge: true }
                });
                return false;
            }
        }
    };
    delete require.cache[buttonRouterPath];
    delete require.cache[selectRouterPath];
    context.after(() => {
        if (previousPolicy) require.cache[policyPath] = previousPolicy;
        else delete require.cache[policyPath];
        if (previousDecision) require.cache[decisionPath] = previousDecision;
        else delete require.cache[decisionPath];
        if (previousValidationAccess) {
            require.cache[validationAccessPath] = previousValidationAccess;
        } else delete require.cache[validationAccessPath];
        delete require.cache[buttonRouterPath];
        delete require.cache[selectRouterPath];
    });

    const buttonRouter = require(buttonRouterPath);
    const selectRouter = require(selectRouterPath);
    for (const customId of BUTTON_IDS) {
        const interaction = deniedInteraction(customId);
        assert.equal(await buttonRouter(interaction), true);
        assert.equal(interaction.replies, 1, customId);
    }
    for (const customId of SELECT_IDS) {
        const interaction = deniedInteraction(customId);
        assert.equal(await selectRouter(interaction), true);
        assert.equal(interaction.replies, 1, customId);
    }

    assert.deepEqual(
        calls.map(call => call.customId),
        [...BUTTON_IDS, ...SELECT_IDS]
    );
    for (const call of calls) {
        assert.equal(call.permission, "characters");
        assert.deepEqual(
            call.options,
            call.customId === "v2_staff_characters_pending"
                ? { write: false, allowValidationBridge: true }
                : { write: false }
        );
    }
});

test("2C.7i classe les mutations Personnages sous characters write:true", async context => {
    const previousPolicy = require.cache[policyPath];
    const previousDecision = require.cache[decisionPath];
    const calls = [];
    require.cache[policyPath] = {
        id: policyPath,
        filename: policyPath,
        loaded: true,
        exports: {
            canAccess: (...args) => {
                calls.push(args);
                return false;
            },
            canManageCharacters: () => false
        }
    };
    require.cache[decisionPath] = {
        id: decisionPath,
        filename: decisionPath,
        loaded: true,
        exports: {
            decide: options => {
                calls.push(options);
                return { allowed: false };
            }
        }
    };
    delete require.cache[buttonRouterPath];
    const router = require(buttonRouterPath);
    context.after(() => {
        if (previousPolicy) require.cache[policyPath] = previousPolicy;
        else delete require.cache[policyPath];
        if (previousDecision) require.cache[decisionPath] = previousDecision;
        else delete require.cache[decisionPath];
        delete require.cache[buttonRouterPath];
    });

    const interaction = deniedInteraction("v2_staff_character_gender_set:id:female:0:quick");
    interaction.isButton = () => true;
    assert.equal(await router(interaction), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].permission, "characters");
    assert.equal(calls[0].write, true);
});

test("2B.2b conserve toutes les sources historiques sur un customId forgé", async context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    for (const guildId of ["guild-a", "guild-b"]) {
        isolated.database.prepare(`
            INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, '2026-08-29')
        `).run(guildId, guildId);
    }

    const permissionModules = [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/repositories/GuildSettingsRepository",
        "../src/v2/managers/GuildSettingsV2Manager",
        "../src/v2/core/policies/GuildManagementPolicy",
        "../src/v2/core/policies/ValidationStaffPolicy",
        "../src/v2/core/policies/StaffPermissionPolicy",
        "../src/v2/core/services/ValidationBridgeQualificationService",
        "../src/v2/core/services/StaffPermissionDecisionService"
    ];
    const isolatedModulePaths = [
        ...permissionModules.map(modulePath => require.resolve(modulePath)),
        validationAccessPath,
        buttonRouterPath
    ];
    const previousIsolatedModules = new Map(
        isolatedModulePaths.map(modulePath => [modulePath, require.cache[modulePath]])
    );
    for (const modulePath of isolatedModulePaths) {
        delete require.cache[modulePath];
    }

    const manager = require("../src/v2/managers/StaffPermissionV2Manager");
    const settings = require("../src/v2/managers/GuildSettingsV2Manager");
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-characters",
        permissionKeys: ["characters"], grantedBy: "owner"
    });
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-reader",
        permissionKeys: ["read_only"], grantedBy: "owner"
    });
    manager.replaceUserPermissions({
        guildId: "guild-a", discordUserId: "direct-characters",
        permissionKeys: ["characters"], grantedBy: "owner"
    });
    settings.setValidationChannel("guild-a", "validation");
    manager.setValidationChannelAccess({
        guildId: "guild-a", enabled: true, updatedBy: "owner"
    });

    const validationManagerPath = require.resolve(
        "../src/v2/services/validation/ValidationManagerV2"
    );
    const previousValidationManager = require.cache[validationManagerPath];
    require.cache[validationManagerPath] = {
        id: validationManagerPath,
        filename: validationManagerPath,
        loaded: true,
        exports: { getPendingForGuild: () => [] }
    };
    context.after(() => {
        if (previousValidationManager) {
            require.cache[validationManagerPath] = previousValidationManager;
        } else delete require.cache[validationManagerPath];
        for (const modulePath of isolatedModulePaths) {
            const previousModule = previousIsolatedModules.get(modulePath);
            if (previousModule) require.cache[modulePath] = previousModule;
            else delete require.cache[modulePath];
        }
        isolated.cleanup();
    });

    const router = require(buttonRouterPath);
    let rendered = 0;
    function interaction({
        guildId = "guild-a", userId = "member", roleIds = [],
        owner = false, administrator = false, validationAccess = false
    } = {}) {
        const validationChannel = {
            id: "validation",
            permissionsFor: () => ({ has: () => validationAccess })
        };
        return {
            customId: "v2_staff_characters_pending",
            guildId,
            user: { id: owner ? "owner" : userId },
            member: {
                roles: { cache: new Map(roleIds.map(id => [id, {}])) },
                permissions: { has: () => administrator }
            },
            memberPermissions: { has: () => administrator },
            guild: {
                id: guildId,
                ownerId: "owner",
                channels: { cache: new Map([["validation", validationChannel]]) }
            },
            isButton: () => true,
            update: async () => { rendered += 1; },
            reply: async () => {},
            followUp: async () => {}
        };
    }

    const cases = [
        [{ roleIds: ["role-characters"] }, true],
        [{ userId: "direct-characters" }, true],
        [{ roleIds: ["role-reader"] }, true],
        [{ owner: true }, true],
        [{ administrator: true }, true],
        [{ validationAccess: true }, true],
        [{}, false],
        [{ guildId: "guild-b", roleIds: ["role-characters"] }, false]
    ];
    for (const [identity, allowed] of cases) {
        const before = rendered;
        await router(interaction(identity));
        assert.equal(rendered - before, allowed ? 1 : 0);
    }
});
