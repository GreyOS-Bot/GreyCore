const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function insertGuild(database, guildId) {
    database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, '2026-08-31')
    `).run(guildId, guildId);
}

function reloadManager() {
    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager"
    ]) delete require.cache[require.resolve(modulePath)];
    return require("../src/v2/managers/StaffPermissionV2Manager");
}

function expected(row) {
    return row ? {
        present: true,
        effect: row.effect,
        updatedAt: row.updatedAt
    } : { present: false };
}

function setup(context) {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuild(isolated.database, "guild-a");
    insertGuild(isolated.database, "guild-b");
    return { ...isolated, manager: reloadManager() };
}

test("2C.3a réalise les transitions ciblées rôle allow/deny/unset", context => {
    const { manager } = setup(context);
    let result = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "allow", actorId: "admin-a", expected: { present: false }
    });
    assert.equal(result.status, "created");
    assert.equal(result.current.effect, "allow");
    assert.equal(result.current.actorId, "admin-a");
    const createdAt = result.current.createdAt;

    result = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "deny", actorId: "admin-b", expected: expected(result.current)
    });
    assert.equal(result.status, "updated");
    assert.equal(result.current.effect, "deny");
    assert.equal(result.current.actorId, "admin-b");
    assert.equal(result.current.createdAt, createdAt);
    assert.notEqual(result.current.updatedAt, result.previous.updatedAt);

    result = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "allow", actorId: "admin-c", expected: expected(result.current)
    });
    assert.equal(result.status, "updated");
    assert.equal(result.current.effect, "allow");
    result = manager.clearRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        actorId: "admin-d", expected: expected(result.current)
    });
    assert.equal(result.status, "cleared");
    assert.equal(result.current, null);
    assert.equal(manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ), null);
    const directDeny = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "bank",
        effect: "deny", actorId: "admin-a", expected: { present: false }
    });
    assert.equal(directDeny.status, "created");
    assert.equal(directDeny.current.effect, "deny");
});

test("2C.3a réalise les transitions ciblées user allow/deny/unset", context => {
    const { manager } = setup(context);
    let allow = manager.setUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        effect: "allow", actorId: "admin-a", expected: { present: false }
    });
    assert.equal(allow.status, "created");
    let deny = manager.setUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        effect: "deny", actorId: "admin-b", expected: expected(allow.current)
    });
    assert.equal(deny.status, "updated");
    assert.equal(deny.current.effect, "deny");
    allow = manager.setUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        effect: "allow", actorId: "admin-c", expected: expected(deny.current)
    });
    assert.equal(allow.status, "updated");
    deny = manager.setUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        effect: "deny", actorId: "admin-d", expected: expected(allow.current)
    });
    const cleared = manager.clearUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        actorId: "admin-e", expected: expected(deny.current)
    });
    assert.equal(cleared.status, "cleared");
    const directDeny = manager.setUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "logs",
        effect: "deny", actorId: "admin-a", expected: { present: false }
    });
    assert.equal(directDeny.status, "created");
    assert.equal(directDeny.current.effect, "deny");
});

test("2C.3a protège les créations concurrentes et les clears UNSET", context => {
    const { manager } = setup(context);
    const initial = { present: false };
    const winner = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "allow", actorId: "admin-a", expected: initial
    });
    const loser = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "deny", actorId: "admin-b", expected: initial
    });
    assert.equal(winner.status, "created");
    assert.equal(loser.status, "stale");
    assert.equal(loser.current.effect, "allow");
    assert.equal(loser.current.actorId, "admin-a");
    const staleClear = manager.clearRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        actorId: "admin-b", expected: initial
    });
    assert.equal(staleClear.status, "stale");
    const noop = manager.clearRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "phone",
        actorId: "admin-a", expected: initial
    });
    assert.equal(noop.status, "noop");
});

test("2C.3a détecte le stale sur la même permission sans altérer état/acteur/version", context => {
    const { manager } = setup(context);
    const created = manager.setUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        effect: "allow", actorId: "admin-a", expected: { present: false }
    });
    const snapshot = expected(created.current);
    const winner = manager.setUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        effect: "deny", actorId: "admin-b", expected: snapshot
    });
    const loser = manager.clearUserPermissionAssignment({
        guildId: "guild-a", discordUserId: "user-a", permissionKey: "phone",
        actorId: "admin-c", expected: snapshot
    });
    assert.equal(winner.status, "updated");
    assert.equal(loser.status, "stale");
    assert.equal(loser.current.effect, "deny");
    assert.equal(loser.current.actorId, "admin-b");
    assert.equal(loser.current.updatedAt, winner.current.updatedAt);
});

test("2C.3a conserve deux mutations concurrentes sur des permissions différentes", context => {
    const { manager } = setup(context);
    const scenes = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "deny", actorId: "admin-a", expected: { present: false }
    });
    const phone = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "phone",
        effect: "allow", actorId: "admin-b", expected: { present: false }
    });
    assert.equal(scenes.status, "created");
    assert.equal(phone.status, "created");
    assert.equal(manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ).effect, "deny");
    assert.equal(manager.getRolePermissionAssignment(
        "guild-a", "role-a", "phone"
    ).effect, "allow");
});

test("2C.3a traite NULL legacy avec IS et détecte sa version stale", context => {
    const { database, manager } = setup(context);
    const insertLegacy = key => database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, effect, granted_by,
            created_at, updated_at
        ) VALUES ('guild-a', 'legacy-role', ?, NULL, 'legacy', 'before', 'before')
    `).run(key);
    insertLegacy("scenes");
    insertLegacy("phone");
    insertLegacy("bank");
    const scenes = manager.getRolePermissionAssignment(
        "guild-a", "legacy-role", "scenes"
    );
    assert.equal(scenes.effect, null);
    const allow = manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "legacy-role", permissionKey: "scenes",
        effect: "allow", actorId: "admin", expected: expected(scenes)
    });
    assert.equal(allow.status, "updated");
    const phone = manager.getRolePermissionAssignment(
        "guild-a", "legacy-role", "phone"
    );
    assert.equal(manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "legacy-role", permissionKey: "phone",
        effect: "deny", actorId: "admin", expected: expected(phone)
    }).status, "updated");
    const bank = manager.getRolePermissionAssignment(
        "guild-a", "legacy-role", "bank"
    );
    database.prepare(`
        UPDATE GuildStaffRolePermissionsV2 SET updated_at = 'changed'
        WHERE guild_id = 'guild-a' AND role_id = 'legacy-role'
          AND permission_key = 'bank'
    `).run();
    assert.equal(manager.clearRolePermissionAssignment({
        guildId: "guild-a", roleId: "legacy-role", permissionKey: "bank",
        actorId: "admin", expected: expected(bank)
    }).status, "stale");
    const current = manager.getRolePermissionAssignment(
        "guild-a", "legacy-role", "bank"
    );
    assert.equal(current.effect, null);
    assert.equal(manager.clearRolePermissionAssignment({
        guildId: "guild-a", roleId: "legacy-role", permissionKey: "bank",
        actorId: "admin", expected: expected(current)
    }).status, "cleared");
});

test("2C.3a applique la matrice optimiste des defaults", context => {
    const { manager } = setup(context);
    const absent = { present: false };
    const allow = manager.setPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes", effect: "allow",
        actorId: "admin-a", expected: absent
    });
    assert.equal(allow.status, "created");
    assert.equal(allow.current.updatedBy, "admin-a");
    const raced = manager.setPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes", effect: "deny",
        actorId: "admin-b", expected: absent
    });
    assert.equal(raced.status, "stale");
    const deny = manager.setPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes", effect: "deny",
        actorId: "admin-b", expected: expected(allow.current)
    });
    assert.equal(deny.status, "updated");
    const back = manager.setPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes", effect: "allow",
        actorId: "admin-c", expected: expected(deny.current)
    });
    assert.equal(back.status, "updated");
    const stale = manager.clearPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes",
        actorId: "admin-d", expected: expected(deny.current)
    });
    assert.equal(stale.status, "stale");
    assert.equal(stale.current.effect, "allow");
    assert.equal(manager.clearPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes",
        actorId: "admin-e", expected: expected(back.current)
    }).status, "cleared");
    assert.equal(manager.clearPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes",
        actorId: "admin-e", expected: absent
    }).status, "noop");
    const directDeny = manager.setPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "phone", effect: "deny",
        actorId: "admin-f", expected: absent
    });
    assert.equal(directDeny.status, "created");
    assert.equal(directDeny.current.effect, "deny");
});

test("2C.3a isole les guilds même avec les mêmes sujets et permissions", context => {
    const { manager } = setup(context);
    manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "same-role", permissionKey: "scenes",
        effect: "deny", actorId: "admin-a", expected: { present: false }
    });
    manager.setRolePermissionAssignment({
        guildId: "guild-b", roleId: "same-role", permissionKey: "scenes",
        effect: "allow", actorId: "admin-b", expected: { present: false }
    });
    assert.equal(manager.getRolePermissionAssignment(
        "guild-a", "same-role", "scenes"
    ).effect, "deny");
    assert.equal(manager.getRolePermissionAssignment(
        "guild-b", "same-role", "scenes"
    ).effect, "allow");
});

test("2C.3a valide catalogue, effets, identifiants, acteur et expected", context => {
    const { manager } = setup(context);
    const base = {
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "allow", actorId: "admin", expected: { present: false }
    };
    for (const permissionKey of ["*", "unknown", "", "   "]) {
        assert.throws(() => manager.setRolePermissionAssignment({
            ...base, permissionKey
        }), /inconnue/);
    }
    for (const effect of ["unset", "banana", null]) {
        assert.throws(() => manager.setRolePermissionAssignment({
            ...base, effect
        }), /invalide/);
    }
    for (const [field, value] of [
        ["guildId", ""], ["roleId", "  "], ["actorId", null]
    ]) {
        assert.throws(() => manager.setRolePermissionAssignment({
            ...base, [field]: value
        }), /requis/);
    }
    assert.throws(() => manager.setRolePermissionAssignment({
        ...base, expected: { present: true, effect: "allow" }
    }), /requis/);
});
