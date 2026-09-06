const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

const isolated = createIsolatedDatabase({ initializeSchema: true });

test.after(() => isolated.cleanup());

const servicePath = require.resolve(
    "../src/v2/services/publicPlaces/PublicPlaceForumService"
);
const buttonRouterPath = require.resolve("../src/v2/router/buttons/StaffRouter");
const selectRouterPath = require.resolve("../src/v2/router/selects/StaffSelectRouter");

function makeInteraction({
    customId,
    userId = "member",
    roleIds = [],
    owner = false,
    administrator = false,
    validationAccess = false
}) {
    const forum = { id: "forum", threads: {} };
    const validationChannel = {
        id: "validation",
        permissionsFor: () => ({ has: () => validationAccess })
    };
    return {
        customId,
        values: ["forum"],
        guildId: "guild",
        user: { id: owner ? "owner" : userId },
        member: {
            roles: { cache: new Map(roleIds.map(id => [id, {}])) },
            permissions: { has: () => administrator }
        },
        memberPermissions: { has: () => administrator },
        guild: {
            id: "guild",
            ownerId: "owner",
            channels: {
                cache: new Map([["validation", validationChannel]]),
                fetch: async () => forum
            }
        },
        isButton: () => customId.startsWith("v2_staff_public_places_refresh:"),
        deferUpdate: async () => {},
        editReply: async () => {},
        update: async () => {},
        reply: async () => {},
        followUp: async () => {}
    };
}

test("2B.2a revalide les synchronisations de lieux publics en écriture", async context => {
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES ('guild', 'Guild', '2026-08-29')
    `).run();

    const manager = require("../src/v2/managers/StaffPermissionV2Manager");
    const settings = require("../src/v2/managers/GuildSettingsV2Manager");
    manager.replaceRolePermissions({
        guildId: "guild", roleId: "role-scenes",
        permissionKeys: ["scenes"], grantedBy: "owner"
    });
    manager.replaceRolePermissions({
        guildId: "guild", roleId: "role-reader",
        permissionKeys: ["read_only"], grantedBy: "owner"
    });
    manager.replaceUserPermissions({
        guildId: "guild", discordUserId: "direct-scenes",
        permissionKeys: ["scenes"], grantedBy: "owner"
    });
    settings.setValidationChannel("guild", "validation");
    manager.setValidationChannelAccess({
        guildId: "guild", enabled: true, updatedBy: "owner"
    });

    let synchronizeCalls = 0;
    const previousService = require.cache[servicePath];
    require.cache[servicePath] = {
        id: servicePath,
        filename: servicePath,
        loaded: true,
        exports: {
            synchronize: async () => {
                synchronizeCalls += 1;
                return [];
            }
        }
    };
    delete require.cache[buttonRouterPath];
    delete require.cache[selectRouterPath];
    context.after(() => {
        if (previousService) require.cache[servicePath] = previousService;
        else delete require.cache[servicePath];
        delete require.cache[buttonRouterPath];
        delete require.cache[selectRouterPath];
    });

    const buttonRouter = require(buttonRouterPath);
    const selectRouter = require(selectRouterPath);
    const cases = [
        ["scenes par rôle", { roleIds: ["role-scenes"] }, true],
        ["scenes par utilisateur", { userId: "direct-scenes" }, true],
        ["owner", { owner: true }, true],
        ["Administrator", { administrator: true }, true],
        ["validation legacy", { validationAccess: true }, false],
        ["read_only", { roleIds: ["role-reader"] }, false],
        ["aucun droit", {}, false]
    ];

    for (const [label, identity, allowed] of cases) {
        for (const [router, customId] of [
            [buttonRouter, "v2_staff_public_places_refresh:forum"],
            [selectRouter, "v2_staff_scenes_public_forum_select"]
        ]) {
            const before = synchronizeCalls;
            await router(makeInteraction({ customId, ...identity }));
            assert.equal(
                synchronizeCalls - before,
                allowed ? 1 : 0,
                `${label} via ${customId}`
            );
        }
    }
});

test("2B.2a conserve la consultation paginée des lieux publics en lecture", async () => {
    const policy = require("../src/v2/core/policies/StaffPermissionPolicy");
    const reader = makeInteraction({
        customId: "v2_staff_public_places_page:forum:0",
        roleIds: ["role-reader"]
    });
    assert.equal(policy.canAccess(reader, "scenes", { write: false }), true);
    assert.equal(policy.canAccess(reader, "scenes", { write: true }), false);
});
