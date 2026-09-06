const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function insertGuild(database, guildId) {
    database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, '2026-08-31')
    `).run(guildId, guildId);
}

function insertAssignment(database, {
    guildId = "guild-a", subjectType = "role", subjectId,
    permissionKey, effect = null
}) {
    const user = subjectType === "user";
    database.prepare(`
        INSERT INTO ${user ? "GuildStaffUserPermissionsV2" : "GuildStaffRolePermissionsV2"} (
            guild_id, ${user ? "discord_user_id" : "role_id"}, permission_key,
            effect, granted_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'legacy-actor', 'before', 'before')
    `).run(guildId, subjectId, permissionKey, effect);
}

function snapshot(database) {
    const role = database.prepare(`
        SELECT guild_id, role_id AS subject_id, permission_key, effect,
               granted_by, created_at, updated_at
        FROM GuildStaffRolePermissionsV2
        ORDER BY guild_id, role_id, permission_key
    `).all().map(row => ({ subject_type: "role", ...row }));
    const user = database.prepare(`
        SELECT guild_id, discord_user_id AS subject_id, permission_key, effect,
               granted_by, created_at, updated_at
        FROM GuildStaffUserPermissionsV2
        ORDER BY guild_id, discord_user_id, permission_key
    `).all().map(row => ({ subject_type: "user", ...row }));
    return [...role, ...user];
}

function reloadPermissions() {
    for (const modulePath of [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/core/policies/StaffPermissionPolicy",
        "../src/v2/pages/staff/StaffPermissionsPage",
        "../src/v2/services/permissions/StaffPermissionV3DraftService",
        "../src/v2/router/selects/StaffSelectRouter",
        "../src/v2/router/buttons/StaffRouter"
    ]) delete require.cache[require.resolve(modulePath)];
    return {
        manager: require("../src/v2/managers/StaffPermissionV2Manager"),
        page: require("../src/v2/pages/staff/StaffPermissionsPage"),
        drafts: require("../src/v2/services/permissions/StaffPermissionV3DraftService"),
        selectRouter: require("../src/v2/router/selects/StaffSelectRouter"),
        buttonRouter: require("../src/v2/router/buttons/StaffRouter")
    };
}

function setup(context) {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    insertGuild(isolated.database, "guild-a");
    insertGuild(isolated.database, "guild-b");
    return { ...isolated, ...reloadPermissions() };
}

function interaction({
    customId = "", values = [], guildId = "guild-a", userId = "admin",
    ownerId = "admin", administrator = false
} = {}) {
    const calls = { updates: [], replies: [] };
    return {
        customId, values, guildId,
        guild: { id: guildId, ownerId, channels: { cache: new Map() } },
        user: { id: userId },
        memberPermissions: { has: () => administrator },
        member: { permissions: { has: () => administrator } },
        isButton: () => true,
        isMessageComponent: () => true,
        async update(payload) { calls.updates.push(payload); },
        async reply(payload) { calls.replies.push(payload); },
        calls
    };
}

function seedHistoricalMatrix(database) {
    const assignments = [
        ["role", "role-a", "scenes", null],
        ["role", "role-a", "phone", "allow"],
        ["role", "role-a", "logs", "deny"],
        ["role", "role-a", "*", null],
        ["role", "role-a", "custom_role", "allow"],
        ["role", "role-a", "", "deny"],
        ["user", "user-a", "characters", null],
        ["user", "user-a", "custom_user", "deny"],
        ["user", "user-a", "   ", "allow"]
    ];
    for (const [subjectType, subjectId, permissionKey, effect] of assignments) {
        insertAssignment(database, {
            subjectType, subjectId, permissionKey, effect
        });
    }
}

test("2C.3d neutralise tous les formats v2 sans toucher aux lignes historiques", async context => {
    const api = setup(context);
    seedHistoricalMatrix(api.database);
    const before = snapshot(api.database);
    const customIds = [
        "v2_staff_permissions_role",
        "v2_staff_permissions_user",
        "v2_staff_permissions_save:role",
        "v2_staff_permissions_save:user",
        "v2_staff_permissions_save:role:role-a",
        "v2_staff_permissions_save:user:user-a",
        "v2_staff_permissions_save:ancien-format-inconnu"
    ];
    for (const customId of customIds) {
        const current = interaction({
            customId,
            values: ["scenes", "phone", "logs"]
        });
        assert.equal(await api.selectRouter(current), true);
        assert.match(current.calls.replies[0].content, /interface de permissions a expiré/i);
        assert.deepEqual(snapshot(api.database), before);
    }
});

test("2C.3d ne laisse aucun constructeur ou draft v2 actif", () => {
    const root = path.join(__dirname, "..", "src", "v2");
    assert.equal(
        fs.existsSync(path.join(root, "services", "permissions", "StaffPermissionDraftService.js")),
        false
    );
    const pageSource = fs.readFileSync(
        path.join(root, "pages", "staff", "StaffPermissionsPage.js"), "utf8"
    );
    const selectSource = fs.readFileSync(
        path.join(root, "router", "selects", "StaffSelectRouter.js"), "utf8"
    );
    assert.doesNotMatch(pageSource, /buildPermissionSelection/);
    assert.doesNotMatch(pageSource, /v2_staff_permissions_(role|user|save)/);
    assert.doesNotMatch(selectSource, /replace(Role|User)Permissions/);
    assert.match(pageSource, /v2_staff_permissions_toggle_validation/);
});

test("2C.3d diagnostique uniquement les clés hors catalogue et isole les guilds", context => {
    const api = setup(context);
    for (const [subjectType, subjectId, permissionKey, effect] of [
        ["role", "role-a", "*", null],
        ["role", "role-a", "custom_x", "allow"],
        ["role", "role-a", "", "deny"],
        ["user", "user-a", "   ", null],
        ["user", "user-a", "characters", null],
        ["role", "role-a", "scenes", "allow"],
        ["user", "user-a", "logs", "deny"]
    ]) {
        insertAssignment(api.database, {
            subjectType, subjectId, permissionKey, effect
        });
    }
    insertAssignment(api.database, {
        guildId: "guild-b", subjectType: "role", subjectId: "role-b",
        permissionKey: "other_unknown", effect: null
    });
    assert.deepEqual(api.manager.getLegacyAssignmentDiagnostic("guild-a"), {
        roles: 3,
        users: 1,
        total: 4
    });
    assert.deepEqual(api.manager.getLegacyAssignmentDiagnostic("guild-b"), {
        roles: 1,
        users: 0,
        total: 1
    });
});

test("2C.3d affiche seulement un diagnostic agrégé et garde la page disponible", context => {
    const api = setup(context);
    for (const [subjectType, subjectId, permissionKey] of [
        ["role", "role-a", "*"],
        ["role", "role-a", "custom_x"],
        ["role", "role-a", ""],
        ["user", "user-a", "   "]
    ]) {
        insertAssignment(api.database, {
            subjectType, subjectId, permissionKey
        });
    }
    const payload = api.page.buildAccessSelection("guild-a");
    const json = JSON.stringify(payload);
    assert.match(json, /4 assignation\(s\) historique\(s\) non reconnue\(s\)/);
    assert.match(json, /rôles : 3, utilisateurs : 1/);
    for (const secretKey of ["custom_x", "role-a", "user-a"]) {
        assert.doesNotMatch(json, new RegExp(secretKey));
    }
    assert.match(json, /v3_staff_permissions_role/);
    assert.match(json, /v3_staff_permissions_user/);
    assert.match(json, /v3_staff_permission_defaults/);
    assert.match(json, /v2_staff_permissions_toggle_validation/);

    api.manager.getLegacyAssignmentDiagnostic = () => {
        throw new Error("sensitive database detail");
    };
    const fallback = JSON.stringify(api.page.buildAccessSelection("guild-a"));
    assert.match(fallback, /Diagnostic des assignations historiques indisponible/);
    assert.doesNotMatch(fallback, /sensitive database detail/);
    assert.match(fallback, /v3_staff_permissions_role/);
});

test("2C.3d les handlers v2 et v3 n’appellent aucune API replace globale", async context => {
    const api = setup(context);
    const replaceMethods = [
        "replaceRolePermissions",
        "replaceRolePermissionAssignments",
        "replaceRolePermissionsForMany",
        "replaceUserPermissions",
        "replaceUserPermissionAssignments",
        "replaceUserPermissionsForMany"
    ];
    for (const method of replaceMethods) {
        api.manager[method] = () => {
            throw new Error(`replace interdit: ${method}`);
        };
    }

    const expired = interaction({
        customId: "v2_staff_permissions_save:role:role-a",
        values: ["scenes"]
    });
    await api.selectRouter(expired);
    assert.match(expired.calls.replies[0].content, /expiré/i);

    const draft = api.drafts.start({
        guildId: "guild-a", adminUserId: "admin",
        subjectType: "role", subjectId: "role-a"
    });
    api.drafts.selectPermission(draft, "scenes", { present: false });
    const roleSet = interaction({
        customId: `v3_staff_permissions_set:${draft.token}:allow`
    });
    await api.buttonRouter(roleSet);
    assert.equal(
        api.manager.getRolePermissionAssignment("guild-a", "role-a", "scenes").effect,
        "allow"
    );

    const defaultDraft = api.drafts.startDefault({
        guildId: "guild-a", adminUserId: "admin"
    });
    api.drafts.selectPermission(defaultDraft, "phone", { present: false });
    const defaultSet = interaction({
        customId: `v3_staff_permission_default_set:${defaultDraft.token}:deny`
    });
    await api.buttonRouter(defaultSet);
    assert.equal(api.manager.getPermissionDefault("guild-a", "phone").effect, "deny");
});

test("2C.3d les mutations v3 ciblées préservent toutes les clés legacy voisines", async context => {
    const api = setup(context);
    seedHistoricalMatrix(api.database);
    const legacyBefore = snapshot(api.database).filter(
        row => !["scenes", "phone", "logs", "characters"].includes(row.permission_key)
    );
    const draft = api.drafts.start({
        guildId: "guild-a", adminUserId: "admin",
        subjectType: "user", subjectId: "user-a"
    });
    api.drafts.selectPermission(draft, "phone", { present: false });
    const current = interaction({
        customId: `v3_staff_permissions_set:${draft.token}:allow`
    });
    await api.buttonRouter(current);
    const legacyAfter = snapshot(api.database).filter(
        row => !["scenes", "phone", "logs", "characters"].includes(row.permission_key)
    );
    assert.deepEqual(legacyAfter, legacyBefore);
});
