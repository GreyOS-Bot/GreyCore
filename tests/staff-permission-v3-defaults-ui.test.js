const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function insertGuild(database, guildId) {
    database.prepare(`
        INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, '2026-08-31')
    `).run(guildId, guildId);
}

function reloadUi() {
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

function expected(current) {
    return current ? {
        present: true,
        effect: current.effect,
        updatedAt: current.updatedAt
    } : { present: false };
}

function prepareDefault(api, permissionKey, adminUserId = "admin") {
    const draft = api.drafts.startDefault({
        guildId: "guild-a", adminUserId
    });
    const current = api.manager.getPermissionDefault("guild-a", permissionKey);
    api.drafts.selectPermission(draft, permissionKey, expected(current));
    return { draft, current };
}

async function click(api, draft, action, overrides = {}) {
    const current = interaction({
        customId: `v3_staff_permission_default_set:${draft.token}:${action}`,
        ...overrides
    });
    await api.buttonRouter(current);
    return current;
}

test("2C.3c ouvre les defaults pour owner/Admin et refuse un non-admin", async context => {
    const api = setup(context);
    const fresh = api.page.buildAccessSelection("guild-a");
    assert.match(JSON.stringify(fresh), /v3_staff_permission_defaults/);

    for (const allowed of [
        interaction(),
        interaction({ ownerId: "owner", administrator: true })
    ]) {
        allowed.customId = "v3_staff_permission_defaults";
        await api.buttonRouter(allowed);
        assert.match(JSON.stringify(allowed.calls.updates[0]), /Valeurs par défaut/);
        assert.match(
            allowed.calls.updates[0].components[0].components[0].data.custom_id,
            /^v3_staff_permission_default_key:/
        );
    }
    const denied = interaction({
        customId: "v3_staff_permission_defaults",
        ownerId: "owner", userId: "member"
    });
    await api.buttonRouter(denied);
    assert.match(denied.calls.replies[0].content, /ne peux pas modifier/);
});

test("2C.3c choisit une permission catalogue et affiche les trois états", async context => {
    const api = setup(context);
    const draft = api.drafts.startDefault({
        guildId: "guild-a", adminUserId: "admin"
    });
    const select = interaction({
        customId: `v3_staff_permission_default_key:${draft.token}`,
        values: ["scenes"]
    });
    await api.selectRouter(select);
    assert.match(JSON.stringify(select.calls.updates[0]), /Aucun default \/ non défini/);
    assert.equal(draft.expected.present, false);
    const disabled = current => api.page
        .buildV3DefaultPermissionState(draft, current)
        .components[0].components.map(button => Boolean(button.data.disabled));
    assert.deepEqual(disabled(null), [false, false, true]);
    assert.deepEqual(disabled({ effect: "allow" }), [true, false, false]);
    assert.deepEqual(disabled({ effect: "deny" }), [false, true, false]);
    const options = api.page.buildV3DefaultPermissionSelection(draft)
        .components[0].components[0].options;
    assert.equal(options.some(option => option.data.value === "assets"), false);
    assert.equal(options.some(option => ["*", "", "unknown"].includes(option.data.value)), false);
});

test("2C.3c applique UNSET/ALLOW/DENY avec acteur et versions fraîches", async context => {
    const api = setup(context);
    let prepared = prepareDefault(api, "scenes");
    await click(api, prepared.draft, "allow");
    let current = api.manager.getPermissionDefault("guild-a", "scenes");
    assert.equal(current.effect, "allow");
    assert.equal(current.updatedBy, "admin");
    const firstVersion = current.updatedAt;
    await click(api, prepared.draft, "deny");
    current = api.manager.getPermissionDefault("guild-a", "scenes");
    assert.equal(current.effect, "deny");
    assert.notEqual(current.updatedAt, firstVersion);
    await click(api, prepared.draft, "allow");
    assert.equal(api.manager.getPermissionDefault("guild-a", "scenes").effect, "allow");
    await click(api, prepared.draft, "unset");
    assert.equal(api.manager.getPermissionDefault("guild-a", "scenes"), null);

    prepared = prepareDefault(api, "phone");
    await click(api, prepared.draft, "deny");
    assert.equal(api.manager.getPermissionDefault("guild-a", "phone").effect, "deny");
    await click(api, prepared.draft, "unset");
    assert.equal(api.manager.getPermissionDefault("guild-a", "phone"), null);
});

test("2C.3c gère read_only allow, deny et unset sans modifier le resolver", async context => {
    const api = setup(context);
    const prepared = prepareDefault(api, "read_only");
    const initial = api.page.buildV3DefaultPermissionState(
        prepared.draft, prepared.current
    );
    assert.match(JSON.stringify(initial), /default Lecture seule ALLOW/);
    await click(api, prepared.draft, "allow");
    assert.equal(api.manager.getPermissionDefault("guild-a", "read_only").effect, "allow");
    await click(api, prepared.draft, "deny");
    assert.equal(api.manager.getPermissionDefault("guild-a", "read_only").effect, "deny");
    await click(api, prepared.draft, "unset");
    assert.equal(api.manager.getPermissionDefault("guild-a", "read_only"), null);
});

test("2C.3c protège deux créations concurrentes depuis UNSET", async context => {
    const api = setup(context);
    const adminA = prepareDefault(api, "scenes", "admin");
    const adminB = prepareDefault(api, "scenes", "admin-b");
    await click(api, adminA.draft, "allow");
    const stale = await click(api, adminB.draft, "deny", {
        userId: "admin-b", ownerId: "admin-b"
    });
    const current = api.manager.getPermissionDefault("guild-a", "scenes");
    assert.equal(current.effect, "allow");
    assert.equal(current.updatedBy, "admin");
    assert.match(JSON.stringify(stale.calls.updates[0]), /modifiée entre-temps/);
    assert.match(JSON.stringify(stale.calls.updates[0]), /Autorisé par défaut/);
});

test("2C.3c protège une ligne existante concurrente et traite noop", async context => {
    const api = setup(context);
    const created = api.manager.setPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes", effect: "allow",
        actorId: "admin", expected: { present: false }
    });
    const prepared = prepareDefault(api, "scenes");
    api.manager.setPermissionDefaultOptimistic({
        guildId: "guild-a", permissionKey: "scenes", effect: "deny",
        actorId: "other-admin", expected: expected(created.current)
    });
    const stale = await click(api, prepared.draft, "unset");
    const current = api.manager.getPermissionDefault("guild-a", "scenes");
    assert.equal(current.effect, "deny");
    assert.equal(current.updatedBy, "other-admin");
    assert.match(JSON.stringify(stale.calls.updates[0]), /modifiée entre-temps/);

    const absent = prepareDefault(api, "phone");
    const noop = await click(api, absent.draft, "unset");
    assert.equal(api.manager.getPermissionDefault("guild-a", "phone"), null);
    assert.match(JSON.stringify(noop.calls.updates[0]), /déjà non définie/);
});

test("2C.3c isole et expire les tokens default sans mutation", async context => {
    const api = setup(context);
    const prepared = prepareDefault(api, "scenes");
    const unauthorized = interaction({
        customId: `v3_staff_permission_default_set:${prepared.draft.token}:allow`,
        userId: "member", ownerId: "owner"
    });
    await api.buttonRouter(unauthorized);
    assert.match(unauthorized.calls.replies[0].content, /ne peux pas modifier/);
    for (const attempt of [
        interaction({
            customId: `v3_staff_permission_default_key:${prepared.draft.token}`,
            values: ["scenes"], userId: "other", ownerId: "other"
        }),
        interaction({
            customId: `v3_staff_permission_default_key:${prepared.draft.token}`,
            values: ["scenes"], guildId: "guild-b", ownerId: "admin"
        }),
        interaction({
            customId: "v3_staff_permission_default_key:unknown",
            values: ["scenes"]
        })
    ]) {
        await api.selectRouter(attempt);
        assert.match(attempt.calls.replies[0].content, /interface de permissions a expiré/);
    }
    prepared.draft.expiresAt = Date.now() - 1;
    const expired = interaction({
        customId: `v3_staff_permission_default_set:${prepared.draft.token}:allow`
    });
    await api.buttonRouter(expired);
    assert.match(expired.calls.replies[0].content, /interface de permissions a expiré/);
    assert.equal(api.manager.getPermissionDefault("guild-a", "scenes"), null);
});

test("2C.3c refuse wildcard/unknown et n’utilise que les APIs optimistes", async context => {
    const api = setup(context);
    api.manager.setPermissionDefault = () => {
        throw new Error("ancienne API set interdite");
    };
    api.manager.clearPermissionDefault = () => {
        throw new Error("ancienne API clear interdite");
    };
    const prepared = prepareDefault(api, "scenes");
    const forged = interaction({
        customId: `v3_staff_permission_default_key:${prepared.draft.token}`,
        values: ["*"]
    });
    await api.selectRouter(forged);
    assert.match(forged.calls.replies[0].content, /n’est pas disponible/);
    await click(api, prepared.draft, "allow");
    assert.equal(api.manager.getPermissionDefault("guild-a", "scenes").effect, "allow");
    for (const permissionKey of ["*", "unknown", "", "   "]) {
        assert.throws(() => api.manager.setPermissionDefaultOptimistic({
            guildId: "guild-a", permissionKey, effect: "allow",
            actorId: "admin", expected: { present: false }
        }), /inconnue/);
    }
});

test("2C.3c bloque un catalogue supérieur à 25 et conserve les IDs rôle/user", context => {
    const api = setup(context);
    const roleUser = JSON.stringify(api.page.buildAccessSelection("guild-a"));
    assert.match(roleUser, /v3_staff_permissions_role/);
    assert.match(roleUser, /v3_staff_permissions_user/);
    const catalog = require("../src/v2/core/permissions/StaffPermissionCatalog");
    const original = catalog.all;
    catalog.all = () => Array.from({ length: 26 }, (_, index) => ({
        key: `key-${index}`, label: `Permission ${index}`, emoji: "⚖️"
    }));
    context.after(() => { catalog.all = original; });
    const draft = api.drafts.startDefault({
        guildId: "guild-a", adminUserId: "admin"
    });
    const payload = api.page.buildV3DefaultPermissionSelection(draft);
    assert.match(payload.content, /plus de 25 permissions/);
    assert.equal(
        JSON.stringify(payload).includes("v3_staff_permission_default_key:"),
        false
    );
});
