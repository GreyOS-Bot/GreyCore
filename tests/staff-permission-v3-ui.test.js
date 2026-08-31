const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function insertGuild(database, guildId) {
    database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, '2026-08-31')
    `).run(guildId, guildId);
}

function reloadUi() {
    const modules = [
        "../src/v2/repositories/StaffPermissionRepository",
        "../src/v2/managers/StaffPermissionV2Manager",
        "../src/v2/core/policies/StaffPermissionPolicy",
        "../src/v2/pages/staff/StaffPermissionsPage",
        "../src/v2/services/permissions/StaffPermissionV3DraftService",
        "../src/v2/router/selects/StaffSelectRouter",
        "../src/v2/router/buttons/StaffRouter"
    ];
    for (const modulePath of modules) delete require.cache[require.resolve(modulePath)];
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
    return { ...isolated, ...reloadUi() };
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

function expected(assignment) {
    return assignment ? {
        present: true,
        effect: assignment.effect,
        updatedAt: assignment.updatedAt
    } : { present: false };
}

function prepareDraft(api, subjectType, subjectId, permissionKey) {
    const draft = api.drafts.start({
        guildId: "guild-a", adminUserId: "admin", subjectType, subjectId
    });
    const assignment = subjectType === "role"
        ? api.manager.getRolePermissionAssignment("guild-a", subjectId, permissionKey)
        : api.manager.getUserPermissionAssignment("guild-a", subjectId, permissionKey);
    api.drafts.selectPermission(draft, permissionKey, expected(assignment));
    return { draft, assignment };
}

async function click(api, draft, action, overrides = {}) {
    const current = interaction({
        customId: `v3_staff_permissions_set:${draft.token}:${action}`,
        ...overrides
    });
    await api.buttonRouter(current);
    return current;
}

function insertLegacy(database, subjectType, subjectId, permissionKey) {
    const user = subjectType === "user";
    database.prepare(`
        INSERT INTO ${user ? "GuildStaffUserPermissionsV2" : "GuildStaffRolePermissionsV2"} (
            guild_id, ${user ? "discord_user_id" : "role_id"}, permission_key,
            effect, granted_by, created_at, updated_at
        ) VALUES ('guild-a', ?, ?, NULL, 'legacy', 'before', 'before')
    `).run(subjectId, permissionKey);
}

test("2C.3b génère uniquement le parcours v3 mono-rôle/mono-utilisateur", async context => {
    const api = setup(context);
    const owner = interaction();
    await api.page.execute(owner);
    const payload = owner.calls.updates[0];
    const json = JSON.stringify(payload);
    assert.match(json, /v3_staff_permissions_role/);
    assert.match(json, /v3_staff_permissions_user/);
    assert.doesNotMatch(json, /v2_staff_permissions_save:/);
    const role = payload.components[0].components[0].data;
    const user = payload.components[1].components[0].data;
    assert.equal(role.max_values, 1);
    assert.equal(user.max_values, 1);

    const admin = interaction({ ownerId: "owner", administrator: true });
    await api.page.execute(admin);
    assert.equal(admin.calls.updates.length, 1);
    const denied = interaction({ ownerId: "owner", userId: "member" });
    await api.page.execute(denied);
    assert.match(denied.calls.updates[0].content, /Seul le propriétaire/);
});

test("2C.3b sélectionne un sujet puis une clé catalogue avec lecture effect-aware", async context => {
    const api = setup(context);
    const roleSelect = interaction({
        customId: "v3_staff_permissions_role", values: ["role-a"]
    });
    await api.selectRouter(roleSelect);
    const keyCustomId = roleSelect.calls.updates[0]
        .components[0].components[0].data.custom_id;
    assert.match(keyCustomId, /^v3_staff_permissions_key:[A-Za-z0-9_-]+$/);
    assert.ok(keyCustomId.length <= 100);
    const options = roleSelect.calls.updates[0].components[0].components[0].options;
    assert.equal(options.length, 12);
    assert.equal(options.some(option => option.data.value === "assets"), false);

    const keySelect = interaction({ customId: keyCustomId, values: ["scenes"] });
    await api.selectRouter(keySelect);
    const json = JSON.stringify(keySelect.calls.updates[0]);
    assert.match(json, /Hérité \/ non défini/);
    assert.match(json, /v3_staff_permissions_set:/);

    const userSelect = interaction({
        customId: "v3_staff_permissions_user", values: ["user-a"]
    });
    await api.selectRouter(userSelect);
    assert.match(
        userSelect.calls.updates[0].components[0].components[0].data.custom_id,
        /^v3_staff_permissions_key:/
    );
});

test("2C.3b désactive uniquement l’action correspondant à l’état courant", context => {
    const api = setup(context);
    const draft = api.drafts.start({
        guildId: "guild-a", adminUserId: "admin",
        subjectType: "role", subjectId: "role-a"
    });
    api.drafts.selectPermission(draft, "scenes", { present: false });
    const disabled = assignment => api.page
        .buildV3PermissionState(draft, assignment)
        .components[0].components.map(button => Boolean(button.data.disabled));
    assert.deepEqual(disabled(null), [false, false, true]);
    assert.deepEqual(disabled({ effect: "allow" }), [true, false, false]);
    assert.deepEqual(disabled({ effect: "deny" }), [false, true, false]);
    assert.deepEqual(disabled({ effect: null }), [false, false, false]);
});

test("2C.3b applique toute la matrice rôle via les mutations ciblées", async context => {
    const api = setup(context);
    let prepared = prepareDraft(api, "role", "role-a", "scenes");
    await click(api, prepared.draft, "allow");
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ).effect, "allow");
    await click(api, prepared.draft, "deny");
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ).effect, "deny");
    await click(api, prepared.draft, "allow");
    await click(api, prepared.draft, "unset");
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ), null);

    prepared = prepareDraft(api, "role", "role-a", "phone");
    await click(api, prepared.draft, "deny");
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "phone"
    ).effect, "deny");
});

test("2C.3b applique toute la matrice user via les mutations ciblées", async context => {
    const api = setup(context);
    let prepared = prepareDraft(api, "user", "user-a", "phone");
    await click(api, prepared.draft, "allow");
    await click(api, prepared.draft, "deny");
    assert.equal(api.manager.getUserPermissionAssignment(
        "guild-a", "user-a", "phone"
    ).effect, "deny");
    await click(api, prepared.draft, "allow");
    await click(api, prepared.draft, "deny");
    await click(api, prepared.draft, "unset");
    assert.equal(api.manager.getUserPermissionAssignment(
        "guild-a", "user-a", "phone"
    ), null);

    prepared = prepareDraft(api, "user", "user-a", "logs");
    await click(api, prepared.draft, "deny");
    assert.equal(api.manager.getUserPermissionAssignment(
        "guild-a", "user-a", "logs"
    ).effect, "deny");
});

test("2C.3b rend et transforme explicitement les lignes NULL legacy", async context => {
    const api = setup(context);
    for (const subjectType of ["role", "user"]) {
        const subjectId = subjectType === "role" ? "legacy-role" : "legacy-user";
        for (const [permissionKey, action, finalEffect] of [
            ["scenes", "allow", "allow"],
            ["phone", "deny", "deny"],
            ["bank", "unset", null]
        ]) {
            insertLegacy(api.database, subjectType, subjectId, permissionKey);
            const prepared = prepareDraft(api, subjectType, subjectId, permissionKey);
            assert.equal(prepared.assignment.effect, null);
            const view = api.page.buildV3PermissionState(
                prepared.draft, prepared.assignment
            );
            assert.match(JSON.stringify(view), /Autorisé \(legacy\)/);
            assert.equal(
                view.components[0].components.every(button => !button.data.disabled),
                true
            );
            await click(api, prepared.draft, action);
            const current = subjectType === "role"
                ? api.manager.getRolePermissionAssignment(
                    "guild-a", subjectId, permissionKey
                )
                : api.manager.getUserPermissionAssignment(
                    "guild-a", subjectId, permissionKey
                );
            assert.equal(current?.effect ?? null, finalEffect);
        }
    }
});

test("2C.3b recharge un stale sans écraser la modification concurrente", async context => {
    const api = setup(context);
    const created = api.manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "allow", actorId: "admin", expected: { present: false }
    });
    const prepared = prepareDraft(api, "role", "role-a", "scenes");
    api.manager.setRolePermissionAssignment({
        guildId: "guild-a", roleId: "role-a", permissionKey: "scenes",
        effect: "deny", actorId: "other-admin", expected: expected(created.current)
    });
    const response = await click(api, prepared.draft, "unset");
    const current = api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    );
    assert.equal(current.effect, "deny");
    assert.equal(current.actorId, "other-admin");
    assert.match(JSON.stringify(response.calls.updates[0]), /modifiée entre-temps/);
    assert.match(JSON.stringify(response.calls.updates[0]), /Refusé/);
});

test("2C.3b isole et expire les tokens sans aucune mutation", async context => {
    const api = setup(context);
    const prepared = prepareDraft(api, "role", "role-a", "scenes");
    const attempts = [
        interaction({
            customId: `v3_staff_permissions_key:${prepared.draft.token}`,
            values: ["scenes"], userId: "other-admin", ownerId: "other-admin"
        }),
        interaction({
            customId: `v3_staff_permissions_key:${prepared.draft.token}`,
            values: ["scenes"], guildId: "guild-b", ownerId: "admin"
        }),
        interaction({
            customId: "v3_staff_permissions_key:unknown",
            values: ["scenes"]
        })
    ];
    for (const attempt of attempts) {
        await api.selectRouter(attempt);
        assert.match(attempt.calls.replies[0].content, /interface de permissions a expiré/);
    }
    prepared.draft.expiresAt = Date.now() - 1;
    const expired = interaction({
        customId: `v3_staff_permissions_key:${prepared.draft.token}`,
        values: ["scenes"]
    });
    await api.selectRouter(expired);
    assert.match(expired.calls.replies[0].content, /interface de permissions a expiré/);
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ), null);
});

test("2C.3b revalide owner/Admin à la mutation et neutralise l’ancien token", async context => {
    const api = setup(context);
    const prepared = prepareDraft(api, "role", "role-a", "scenes");
    const denied = await click(api, prepared.draft, "allow", {
        userId: "member", ownerId: "owner"
    });
    assert.match(denied.calls.replies[0].content, /ne peux pas modifier/);
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ), null);

    const oldToken = prepared.draft.token;
    await click(api, prepared.draft, "allow");
    assert.notEqual(prepared.draft.token, oldToken);
    const duplicate = interaction({
        customId: `v3_staff_permissions_set:${oldToken}:deny`
    });
    await api.buttonRouter(duplicate);
    assert.match(duplicate.calls.replies[0].content, /interface de permissions a expiré/);
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ).effect, "allow");
});

test("2C.3b ne passe jamais par replace* et préserve les lignes legacy inconnues", async context => {
    const api = setup(context);
    api.database.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2 (
            guild_id, role_id, permission_key, effect, granted_by,
            created_at, updated_at
        ) VALUES ('guild-a', 'role-a', '*', NULL, 'legacy', 'before', 'before')
    `).run();
    for (const method of [
        "replaceRolePermissions", "replaceRolePermissionsForMany",
        "replaceRolePermissionAssignments", "replaceUserPermissions",
        "replaceUserPermissionsForMany", "replaceUserPermissionAssignments"
    ]) api.manager[method] = () => { throw new Error(`replace interdit: ${method}`); };
    const prepared = prepareDraft(api, "role", "role-a", "scenes");
    await click(api, prepared.draft, "deny");
    assert.equal(api.database.prepare(`
        SELECT COUNT(*) AS count FROM GuildStaffRolePermissionsV2
        WHERE guild_id = 'guild-a' AND role_id = 'role-a' AND permission_key = '*'
    `).get().count, 1);
    assert.equal(api.manager.getRolePermissionAssignment(
        "guild-a", "role-a", "scenes"
    ).effect, "deny");
});

test("2C.3b bloque proprement un catalogue supérieur à 25 options", context => {
    const api = setup(context);
    const catalog = require("../src/v2/core/permissions/StaffPermissionCatalog");
    const original = catalog.all;
    catalog.all = () => Array.from({ length: 26 }, (_, index) => ({
        key: `key-${index}`, label: `Permission ${index}`, emoji: "🔐"
    }));
    context.after(() => { catalog.all = original; });
    const draft = api.drafts.start({
        guildId: "guild-a", adminUserId: "admin",
        subjectType: "role", subjectId: "role-a"
    });
    const payload = api.page.buildV3PermissionSelection(draft);
    assert.match(payload.content, /plus de 25 permissions/);
    assert.equal(JSON.stringify(payload).includes("v3_staff_permissions_key:"), false);
});

test("2C.3b expose l’aide read_only et reconnaît les composants v3", context => {
    const api = setup(context);
    const prepared = prepareDraft(api, "role", "role-a", "read_only");
    const payload = api.page.buildV3PermissionState(
        prepared.draft, prepared.assignment
    );
    assert.match(JSON.stringify(payload), /Lecture seule s’applique uniquement/);
    const responses = require("../src/v2/core/services/InteractionResponseService");
    assert.equal(responses.isGreyCoreComponent({
        customId: "v3_staff_permissions_set:token:allow",
        isButton: () => true
    }), true);
});
