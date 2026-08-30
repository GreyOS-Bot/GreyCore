const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function insertGuild(database, guildId) {
    database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES (?, ?, '2026-08-30')
    `).run(guildId, guildId);
}

function reloadPermissions() {
    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/repositories/GuildSettingsRepository",
        "../src/v2/managers/GuildSettingsV2Manager",
        "../src/v2/core/policies/GuildManagementPolicy",
        "../src/v2/core/policies/ValidationStaffPolicy",
        "../src/v2/core/services/StaffPermissionDecisionService",
        "../src/v2/core/policies/StaffPermissionPolicy"
    ]) delete require.cache[require.resolve(modulePath)];
    return {
        repository: require("../src/v2/repositories/StaffPermissionRepository"),
        manager: require("../src/v2/managers/StaffPermissionV2Manager"),
        policy: require("../src/v2/core/policies/StaffPermissionPolicy")
    };
}

function columnNames(database, tableName) {
    return database.prepare(`PRAGMA table_info(${tableName})`)
        .all()
        .map(column => column.name);
}

test("2C.1 crée le modèle effect/defaults complet sur une base neuve", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    const { database } = isolated;
    assert.equal(columnNames(database, "GuildStaffRolePermissionsV2").includes("effect"), true);
    assert.equal(columnNames(database, "GuildStaffUserPermissionsV2").includes("effect"), true);
    assert.equal(Boolean(database.prepare(`
        SELECT 1 FROM sqlite_master
        WHERE type = 'table' AND name = 'GuildStaffPermissionDefaultsV2'
    `).get()), true);

    const rolePk = database.prepare("PRAGMA table_info(GuildStaffRolePermissionsV2)")
        .all().filter(column => column.pk).map(column => column.name);
    const userPk = database.prepare("PRAGMA table_info(GuildStaffUserPermissionsV2)")
        .all().filter(column => column.pk).map(column => column.name);
    assert.deepEqual(rolePk, ["guild_id", "role_id", "permission_key"]);
    assert.deepEqual(userPk, ["guild_id", "discord_user_id", "permission_key"]);
    assert.equal(
        database.prepare("PRAGMA foreign_key_list(GuildStaffPermissionDefaultsV2)")
            .all().some(key => key.table === "Guilds" && key.on_delete === "CASCADE"),
        true
    );
});

test("2C.1 migre une base historique sans backfill et reste idempotent", context => {
    const isolated = createIsolatedDatabase();
    context.after(() => isolated.cleanup());
    const { database } = isolated;
    database.exec(`
        CREATE TABLE Guilds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        INSERT INTO Guilds VALUES ('legacy-guild', 'Legacy', '2026-08-30');
        CREATE TABLE GuildStaffRolePermissionsV2 (
            guild_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            granted_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, role_id, permission_key),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        );
        CREATE TABLE GuildStaffUserPermissionsV2 (
            guild_id TEXT NOT NULL,
            discord_user_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            granted_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, discord_user_id, permission_key),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        );
        INSERT INTO GuildStaffRolePermissionsV2 VALUES
            ('legacy-guild', 'role-known', 'characters', 'actor', 'before', 'before'),
            ('legacy-guild', 'role-unknown', 'old_unknown', 'actor', 'before', 'before'),
            ('legacy-guild', 'role-empty', '', 'actor', 'before', 'before'),
            ('legacy-guild', 'role-spaces', '   ', 'actor', 'before', 'before'),
            ('legacy-guild', 'role-star', '*', 'actor', 'before', 'before');
        INSERT INTO GuildStaffUserPermissionsV2 VALUES
            ('legacy-guild', 'legacy-user', 'phone', 'actor', 'before', 'before'),
            ('legacy-guild', 'legacy-star', '*', 'actor', 'before', 'before');
    `);
    const schemaPath = path.resolve("src/database/schemaV2StaffPermissions.js");
    delete require.cache[require.resolve(schemaPath)];
    const initialize = require(schemaPath);
    initialize();
    initialize();

    assert.equal(columnNames(database, "GuildStaffRolePermissionsV2").filter(name => name === "effect").length, 1);
    assert.equal(columnNames(database, "GuildStaffUserPermissionsV2").filter(name => name === "effect").length, 1);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM GuildStaffRolePermissionsV2").get().count, 5);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM GuildStaffUserPermissionsV2").get().count, 2);
    assert.equal(database.prepare(`
        SELECT COUNT(*) AS count FROM GuildStaffRolePermissionsV2
        WHERE effect IS NULL
    `).get().count, 5);
    assert.equal(database.prepare(`
        SELECT COUNT(*) AS count FROM GuildStaffUserPermissionsV2
        WHERE effect IS NULL
    `).get().count, 2);
    assert.equal(Boolean(database.prepare(`
        SELECT 1 FROM sqlite_master
        WHERE type = 'table' AND name = 'GuildStaffPermissionDefaultsV2'
    `).get()), true);
});

test("2C.1 conserve les APIs historiques et écrit leurs nouvelles lignes en allow", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuild(isolated.database, "guild-a");
    const { manager } = reloadPermissions();
    assert.deepEqual(manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-a",
        permissionKeys: ["characters", "scenes"], grantedBy: "owner"
    }), ["characters", "scenes"]);
    assert.deepEqual(manager.replaceUserPermissions({
        guildId: "guild-a", discordUserId: "user-a",
        permissionKeys: ["phone", "logs"], grantedBy: "owner"
    }), ["logs", "phone"]);
    assert.equal(isolated.database.prepare(`
        SELECT COUNT(*) AS count FROM GuildStaffRolePermissionsV2
        WHERE effect = 'allow'
    `).get().count, 2);
    assert.equal(isolated.database.prepare(`
        SELECT COUNT(*) AS count FROM GuildStaffUserPermissionsV2
        WHERE effect = 'allow'
    `).get().count, 2);
    assert.deepEqual(manager.getRolePermissions("guild-a", "role-a"), ["characters", "scenes"]);
    assert.deepEqual(manager.getUserPermissions("guild-a", "user-a"), ["logs", "phone"]);
});

test("2C.1 stocke et relit les assignments effect-aware sans normaliser NULL", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuild(isolated.database, "guild-a");
    const { manager } = reloadPermissions();
    assert.deepEqual(manager.replaceRolePermissionAssignments({
        guildId: "guild-a", roleId: "role-a", grantedBy: "owner",
        assignments: [
            { permissionKey: "characters", effect: "allow" },
            { permissionKey: "scenes", effect: "deny" }
        ]
    }), [
        { roleId: "role-a", permissionKey: "characters", effect: "allow" },
        { roleId: "role-a", permissionKey: "scenes", effect: "deny" }
    ]);
    assert.deepEqual(manager.replaceUserPermissionAssignments({
        guildId: "guild-a", discordUserId: "user-a", grantedBy: "owner",
        assignments: [
            { permissionKey: "phone", effect: "allow" },
            { permissionKey: "logs", effect: "deny" }
        ]
    }), [
        { permissionKey: "logs", effect: "deny" },
        { permissionKey: "phone", effect: "allow" }
    ]);
    isolated.database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, effect, created_at, updated_at
        ) VALUES ('guild-a', 'legacy-role', 'bank', NULL, 'before', 'before')
    `).run();
    assert.deepEqual(manager.getRolePermissionAssignments("guild-a", "legacy-role"), [
        { roleId: "legacy-role", permissionKey: "bank", effect: null }
    ]);
    assert.deepEqual(
        manager.getPermissionAssignmentsForRoles("guild-a", ["legacy-role", "role-a"]),
        [
            { roleId: "legacy-role", permissionKey: "bank", effect: null },
            { roleId: "role-a", permissionKey: "characters", effect: "allow" },
            { roleId: "role-a", permissionKey: "scenes", effect: "deny" }
        ]
    );
});

test("2C.1 gère les defaults avec validation et isolation par guild", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuild(isolated.database, "guild-a");
    insertGuild(isolated.database, "guild-b");
    const { manager } = reloadPermissions();
    assert.equal(manager.getPermissionDefault("guild-a", "characters"), null);
    assert.equal(manager.setPermissionDefault({
        guildId: "guild-a", permissionKey: "characters",
        effect: "allow", updatedBy: "owner"
    }).effect, "allow");
    assert.equal(manager.setPermissionDefault({
        guildId: "guild-a", permissionKey: "characters",
        effect: "deny", updatedBy: "owner"
    }).effect, "deny");
    manager.setPermissionDefault({
        guildId: "guild-b", permissionKey: "scenes",
        effect: "allow", updatedBy: "owner"
    });
    assert.deepEqual(
        manager.getPermissionDefaults("guild-a").map(row => [row.permissionKey, row.effect]),
        [["characters", "deny"]]
    );
    assert.deepEqual(
        manager.getPermissionDefaults("guild-b").map(row => [row.permissionKey, row.effect]),
        [["scenes", "allow"]]
    );
    assert.equal(manager.clearPermissionDefault("guild-a", "characters"), true);
    assert.equal(manager.getPermissionDefault("guild-a", "characters"), null);
    assert.throws(() => manager.setPermissionDefault({
        guildId: "guild-a", permissionKey: "unknown",
        effect: "allow", updatedBy: "owner"
    }), /inconnue/);
    assert.throws(() => manager.setPermissionDefault({
        guildId: "guild-a", permissionKey: "characters",
        effect: "banana", updatedBy: "owner"
    }), /invalide/);
});

test("2C.1 refuse les effets invalides et préserve les transactions", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuild(isolated.database, "guild-a");
    const { repository, manager } = reloadPermissions();
    manager.replaceRolePermissions({
        guildId: "guild-a", roleId: "role-a",
        permissionKeys: ["characters"], grantedBy: "owner"
    });
    assert.throws(() => repository.replaceRolePermissionAssignments({
        guildId: "guild-a", roleId: "role-a", grantedBy: "owner",
        updatedAt: "now",
        assignments: [{ permissionKey: "scenes", effect: "banana" }]
    }), /CHECK constraint/);
    assert.deepEqual(manager.getRolePermissions("guild-a", "role-a"), ["characters"]);
    assert.throws(() => isolated.database.prepare(`
        INSERT INTO GuildStaffUserPermissionsV2 (
            guild_id, discord_user_id, permission_key, effect,
            created_at, updated_at
        ) VALUES ('guild-a', 'user-a', 'phone', 'banana', 'now', 'now')
    `).run(), /CHECK constraint/);
    assert.throws(() => isolated.database.prepare(`
        INSERT INTO GuildStaffPermissionDefaultsV2 (
            guild_id, permission_key, effect, updated_at
        ) VALUES ('guild-a', 'logs', 'banana', 'now')
    `).run(), /CHECK constraint/);
    for (const invalidKey of ["*", "unknown", "", "   "]) {
        assert.throws(() => manager.replaceUserPermissionAssignments({
            guildId: "guild-a", discordUserId: "user-a", grantedBy: "owner",
            assignments: [{ permissionKey: invalidKey, effect: "allow" }]
        }), /inconnue/);
    }
});

test("2C.1 garde le resolver 2B inchangé même face à une ligne deny", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuild(isolated.database, "guild-a");
    const { manager, policy } = reloadPermissions();
    manager.replaceRolePermissionAssignments({
        guildId: "guild-a", roleId: "role-scenes", grantedBy: "owner",
        assignments: [{ permissionKey: "scenes", effect: "deny" }]
    });
    const currentInteraction = {
        guildId: "guild-a",
        guild: { id: "guild-a", ownerId: "owner", channels: { cache: new Map() } },
        user: { id: "member" },
        member: {
            roles: { cache: new Map([["role-scenes", {}]]) },
            permissions: { has: () => false }
        },
        memberPermissions: { has: () => false }
    };
    assert.equal(policy.canAccess(currentInteraction, "scenes", { write: true }), true);
});
