const test = require("node:test");
const assert = require("node:assert/strict");

const { stubModule } = require("./helpers/moduleStub");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function clear(paths) {
    for (const path of paths) delete require.cache[path];
}

function loadAccessService({ owner = false, decide }) {
    const paths = [
        stubModule(
            "src/v2/core/policies/CharacterManagementPolicy.js",
            { isOwner: () => owner }
        ),
        stubModule(
            "src/v2/core/services/StaffPermissionDecisionService.js",
            { decide }
        )
    ];
    const servicePath = require.resolve(
        "../src/v2/interactions/assets/AssetAccessService"
    );
    delete require.cache[servicePath];
    paths.push(servicePath);
    return {
        service: require(servicePath),
        cleanup: () => clear(paths)
    };
}

test("2C.4c préserve l’ownership avant toute règle staff Assets", context => {
    let decisions = 0;
    const loaded = loadAccessService({
        owner: true,
        decide: () => {
            decisions += 1;
            return { allowed: false, reason: "USER_DENY" };
        }
    });
    context.after(loaded.cleanup);

    const interaction = { user: { id: "owner" } };
    const character = { discord_user_id: "owner" };
    assert.equal(loaded.service.canManage(interaction, character), true);
    assert.equal(loaded.service.canRead(interaction, character), true);
    assert.equal(decisions, 0);
});

test("2C.4c utilise exclusivement assets strict pour les overrides", context => {
    const calls = [];
    let allowed = false;
    const loaded = loadAccessService({
        decide: options => {
            calls.push(options);
            return { allowed };
        }
    });
    context.after(loaded.cleanup);

    const interaction = {
        guildId: "guild",
        guild: { ownerId: "guild-owner" },
        user: { id: "member" },
        memberPermissions: {
            has: permission => permission === "ManageGuild"
        }
    };
    const character = { discord_user_id: "another-user" };

    assert.equal(loaded.service.canManage(interaction, character), false);
    assert.equal(loaded.service.canManageTypes(interaction), false);
    assert.equal(loaded.service.canRead(interaction, character), false);

    allowed = true;
    assert.equal(loaded.service.canManage(interaction, character), true);
    assert.equal(loaded.service.canManageTypes(interaction), true);
    assert.equal(loaded.service.canRead(interaction, character), true);

    assert.deepEqual(
        calls.map(call => ({
            permission: call.permission,
            write: call.write,
            legacyCanAccessParity: call.legacyCanAccessParity
        })),
        [
            { permission: "assets", write: true, legacyCanAccessParity: undefined },
            { permission: "assets", write: true, legacyCanAccessParity: undefined },
            { permission: "assets", write: false, legacyCanAccessParity: undefined },
            { permission: "assets", write: true, legacyCanAccessParity: undefined },
            { permission: "assets", write: true, legacyCanAccessParity: undefined },
            { permission: "assets", write: false, legacyCanAccessParity: undefined }
        ]
    );
});

test("2C.4c distingue lecture staff et mutation", context => {
    const loaded = loadAccessService({
        decide: ({ permission, write, legacyCanAccessParity }) => ({
            allowed: permission === "assets"
                && write === false
                && legacyCanAccessParity === undefined
        })
    });
    context.after(loaded.cleanup);

    const interaction = { user: { id: "staff" } };
    const character = { discord_user_id: "owner" };
    assert.equal(loaded.service.canRead(interaction, character), true);
    assert.equal(loaded.service.canManage(interaction, character), false);
    assert.equal(loaded.service.canManageTypes(interaction), false);
});

test("2C.4c applique réellement la précédence stricte Assets", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(isolated.cleanup);
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild', 'Guild', '2026-09-01')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/repositories/GuildSettingsRepository",
        "../src/v2/managers/GuildSettingsV2Manager",
        "../src/v2/core/services/ValidationBridgeQualificationService",
        "../src/v2/core/services/StaffPermissionDecisionService"
    ]) delete require.cache[require.resolve(modulePath)];
    const staffPermissions = require(
        "../src/v2/managers/StaffPermissionV2Manager"
    );
    const settings = require(
        "../src/v2/managers/GuildSettingsV2Manager"
    );
    const decisions = require(
        "../src/v2/core/services/StaffPermissionDecisionService"
    );
    const loaded = loadAccessService({
        decide: options => decisions.decide(options)
    });
    context.after(loaded.cleanup);

    const role = (roleId, effect) => isolated.database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, effect,
            granted_by, created_at, updated_at
        ) VALUES ('guild', ?, 'assets', ?, 'owner', 'now', 'now')
    `).run(roleId, effect);
    const user = (userId, permission, effect) => isolated.database.prepare(`
        INSERT INTO GuildStaffUserPermissionsV2 (
            guild_id, discord_user_id, permission_key, effect,
            granted_by, created_at, updated_at
        ) VALUES ('guild', ?, ?, ?, 'owner', 'now', 'now')
    `).run(userId, permission, effect);
    const interaction = ({
        userId,
        roles = [],
        ownerId = "owner",
        administrator = false,
        manageGuild = false
    }) => ({
        guildId: "guild",
        guild: { id: "guild", ownerId, channels: { cache: new Map() } },
        user: { id: userId },
        member: {
            roles: { cache: new Map(roles.map(id => [id, {}])) },
            permissions: { has: flag => administrator && flag !== "ManageGuild" }
        },
        memberPermissions: {
            has: flag => administrator || (manageGuild && flag === "ManageGuild")
        }
    });
    const foreign = { discord_user_id: "character-owner" };

    role("role-allow", "allow");
    user("user-deny", "assets", "deny");
    assert.equal(loaded.service.canManage(interaction({
        userId: "user-deny", roles: ["role-allow"]
    }), foreign), false);

    role("role-deny", "deny");
    user("user-allow", "assets", "allow");
    assert.equal(loaded.service.canManage(interaction({
        userId: "user-allow", roles: ["role-deny"]
    }), foreign), true);

    isolated.database.prepare(`
        INSERT INTO GuildStaffPermissionDefaultsV2 (
            guild_id, permission_key, effect, updated_by, updated_at
        ) VALUES ('guild', 'assets', 'allow', 'owner', 'now')
    `).run();
    assert.equal(loaded.service.canManage(
        interaction({ userId: "default-allow" }), foreign
    ), true);
    isolated.database.prepare(`
        UPDATE GuildStaffPermissionDefaultsV2
        SET effect = 'deny' WHERE guild_id = 'guild' AND permission_key = 'assets'
    `).run();
    assert.equal(loaded.service.canManage(
        interaction({ userId: "default-deny" }), foreign
    ), false);

    isolated.database.prepare(`
        DELETE FROM GuildStaffPermissionDefaultsV2
        WHERE guild_id = 'guild' AND permission_key = 'assets'
    `).run();

    user("reader", "read_only", "allow");
    assert.equal(loaded.service.canRead(
        interaction({ userId: "reader" }), foreign
    ), true);
    assert.equal(loaded.service.canManage(
        interaction({ userId: "reader" }), foreign
    ), false);

    assert.equal(loaded.service.canManage(
        interaction({ userId: "owner" }), foreign
    ), true);
    assert.equal(loaded.service.canManage(
        interaction({ userId: "admin", administrator: true }), foreign
    ), true);
    assert.equal(loaded.service.canManage(
        interaction({ userId: "manager", manageGuild: true }), foreign
    ), false);

    settings.setValidationChannel("guild", "validation");
    staffPermissions.setValidationChannelAccess({
        guildId: "guild",
        enabled: true,
        updatedBy: "owner"
    });
    const bridgeOnly = interaction({ userId: "bridge-only" });
    bridgeOnly.guild.channels.cache.set("validation", {
        permissionsFor: () => ({ has: () => true })
    });
    assert.equal(loaded.service.canRead(bridgeOnly, foreign), false);
    assert.equal(loaded.service.canManage(bridgeOnly, foreign), false);
});

test("2C.4c n’installe aucun type depuis le parcours joueur", async context => {
    const calls = { ensure: 0, listed: 0, errors: 0 };
    const paths = [
        stubModule("src/v2/managers/AssetV2Manager.js", {}),
        stubModule("src/v2/managers/AssetTypeV2Manager.js", {
            ensureDefaults: () => { calls.ensure += 1; },
            getForGuild: () => { calls.listed += 1; return []; }
        }),
        stubModule("src/v2/services/dashboard/CharacterDashboardManager.js", {}),
        stubModule("src/v2/pages/character/CharacterAssetsPage.js", {}),
        stubModule("src/v2/interactions/assets/AssetAccessService.js", {
            getCharacterContext: async () => ({ character: {}, continuity: {} })
        }),
        stubModule("src/v2/interactions/assets/AssetModalFactory.js", {}),
        stubModule("src/v2/interactions/assets/AssetViewFactory.js", {}),
        stubModule("src/v2/services/assets/AssetTransferNotificationService.js", {}),
        stubModule("src/v2/core/services/InteractionResponseService.js", {
            replyPrivate: async () => {},
            replyError: async () => { calls.errors += 1; }
        })
    ];
    const handlerPath = require.resolve(
        "../src/v2/interactions/assets/AssetHandler"
    );
    delete require.cache[handlerPath];
    paths.push(handlerPath);
    context.after(() => clear(paths));

    const handler = require(handlerPath);
    await handler.openTypePicker({ guildId: "guild" }, "character");
    assert.deepEqual(calls, { ensure: 0, listed: 1, errors: 1 });
});
