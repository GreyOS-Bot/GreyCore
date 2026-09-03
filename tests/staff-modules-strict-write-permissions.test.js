const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const permissionManager = require("../src/v2/managers/StaffPermissionV2Manager");
const bridgeQualification = require(
    "../src/v2/core/services/ValidationBridgeQualificationService"
);
const administrativeAccess = require(
    "../src/v2/core/services/AdministrativePermissionAccessService"
);

function replaceModule(relativePath, exports) {
    const resolved = require.resolve(path.join(__dirname, "..", relativePath));
    const previous = require.cache[resolved];
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
    return () => {
        if (previous) require.cache[resolved] = previous;
        else delete require.cache[resolved];
    };
}

function loadRouter(relativePath) {
    const resolved = require.resolve(path.join(__dirname, "..", relativePath));
    delete require.cache[resolved];
    return { router: require(resolved), resolved };
}

function interaction(customId, kind, value = "assets") {
    return {
        customId,
        values: [value],
        guildId: "guild",
        user: { id: "member" },
        isButton: () => kind === "button",
        update: async () => {
            throw new Error("business update must not run when access is denied");
        }
    };
}

function strictInteraction({ owner = false, administrator = false } = {}) {
    return {
        guildId: "guild",
        guild: { id: "guild", ownerId: "owner", channels: { cache: new Map() } },
        user: { id: owner ? "owner" : "member" },
        member: {
            user: { id: owner ? "owner" : "member" },
            roles: { cache: new Map([["role", {}]]) },
            permissions: { has: () => administrator }
        },
        memberPermissions: { has: () => administrator }
    };
}

function withStrictAssignments({ roles = [], users = [], defaults = [] }, callback) {
    const originals = {
        roles: permissionManager.getPermissionAssignmentsForRoles,
        users: permissionManager.getUserPermissionAssignments,
        defaults: permissionManager.getPermissionDefaults,
        qualify: bridgeQualification.qualify
    };
    permissionManager.getPermissionAssignmentsForRoles = () => roles;
    permissionManager.getUserPermissionAssignments = () => users;
    permissionManager.getPermissionDefaults = () => defaults;
    bridgeQualification.qualify = () => {
        throw new Error("Validation Bridge must stay disabled for Modules");
    };
    try {
        return callback();
    } finally {
        permissionManager.getPermissionAssignmentsForRoles = originals.roles;
        permissionManager.getUserPermissionAssignments = originals.users;
        permissionManager.getPermissionDefaults = originals.defaults;
        bridgeQualification.qualify = originals.qualify;
    }
}

test("2C.6d5 protège les deux familles de toggles avant tout accès module", async context => {
    let allowed = false;
    const accessCalls = [];
    const errors = [];
    const managerCalls = [];
    const restoreAccess = replaceModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        {
            canWrite: (candidate, permission) => {
                accessCalls.push([candidate.customId, permission]);
                return allowed;
            }
        }
    );
    const restoreResponse = replaceModule(
        "src/v2/core/services/InteractionResponseService.js",
        { replyError: async (candidate, message) => errors.push([candidate.customId, message]) }
    );
    const restoreManager = replaceModule(
        "src/v2/managers/GuildModuleV2Manager.js",
        {
            getModule: key => { managerCalls.push(["getModule", key]); return { key }; },
            isEnabled: (guildId, key) => { managerCalls.push(["isEnabled", guildId, key]); return true; },
            setEnabled: (guildId, key, enabled) => managerCalls.push(["setEnabled", guildId, key, enabled])
        }
    );
    context.after(() => {
        restoreAccess();
        restoreResponse();
        restoreManager();
    });
    const button = loadRouter("src/v2/router/buttons/StaffRouter.js");
    const select = loadRouter("src/v2/router/selects/StaffSelectRouter.js");
    context.after(() => {
        delete require.cache[button.resolved];
        delete require.cache[select.resolved];
    });

    for (const key of ["assets", "phone", "relationships"]) {
        await button.router(interaction(`v2_staff_domain_toggle:${key}`, "button"));
    }
    await select.router(interaction("v2_staff_modules_toggle", "select", "assets"));

    assert.deepEqual(accessCalls, [
        ["v2_staff_domain_toggle:assets", "modules"],
        ["v2_staff_domain_toggle:phone", "modules"],
        ["v2_staff_domain_toggle:relationships", "modules"],
        ["v2_staff_modules_toggle", "modules"]
    ]);
    assert.equal(errors.length, 4);
    assert.deepEqual(managerCalls, []);

    allowed = true;
    const replay = interaction("v2_staff_domain_toggle:phone", "button");
    allowed = false;
    await button.router(replay);
    assert.deepEqual(managerCalls, []);
});

test("2C.6d5 refuse les clés forged avant permission et manager", async context => {
    let accessCalls = 0;
    let managerCalls = 0;
    const errors = [];
    const restoreAccess = replaceModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        { canWrite: () => { accessCalls += 1; return true; } }
    );
    const restoreResponse = replaceModule(
        "src/v2/core/services/InteractionResponseService.js",
        { replyError: async (candidate, message) => errors.push(message) }
    );
    const restoreManager = replaceModule(
        "src/v2/managers/GuildModuleV2Manager.js",
        {
            getModule: () => { managerCalls += 1; return null; },
            isEnabled: () => { managerCalls += 1; return true; },
            setEnabled: () => { managerCalls += 1; }
        }
    );
    context.after(() => {
        restoreAccess();
        restoreResponse();
        restoreManager();
    });
    const button = loadRouter("src/v2/router/buttons/StaffRouter.js");
    context.after(() => delete require.cache[button.resolved]);

    for (const key of ["unknown", "encounters", "states", "outfit", "journal", ""] ) {
        await button.router(interaction(`v2_staff_domain_toggle:${key}`, "button"));
    }
    assert.equal(accessCalls, 0);
    assert.equal(managerCalls, 0);
    assert.equal(errors.length, 6);
});

test("2C.6d5 conserve uniquement modules/write comme autorité", () => {
    const button = fs.readFileSync(path.join(
        __dirname, "../src/v2/router/buttons/StaffRouter.js"
    ), "utf8");
    const select = fs.readFileSync(path.join(
        __dirname, "../src/v2/router/selects/StaffSelectRouter.js"
    ), "utf8");
    assert.match(button, /v2_staff_domain_toggle:[\s\S]*canWrite\(interaction, "modules"\)/);
    assert.match(select, /v2_staff_modules_toggle[\s\S]*canWrite\(interaction, "modules"\)/);
    assert.doesNotMatch(
        button.match(/v2_staff_domain_toggle:[\s\S]*?return true;/)?.[0] || "",
        /StaffPermissionPolicy|StaffPermissionDecisionService|allowValidationBridge/
    );
});

test("2C.6d5 applique roots, allow deny defaults, read_only et cross-domain", () => {
    assert.equal(administrativeAccess.canWrite(strictInteraction({ owner: true }), "modules"), true);
    assert.equal(administrativeAccess.canWrite(strictInteraction({ administrator: true }), "modules"), true);
    const candidate = strictInteraction();
    const cases = [
        [{ users: [{ permissionKey: "modules", effect: "allow" }] }, true],
        [{ users: [{ permissionKey: "modules", effect: "deny" }] }, false],
        [{ roles: [{ roleId: "role", permissionKey: "modules", effect: "allow" }] }, true],
        [{ roles: [{ roleId: "role", permissionKey: "modules", effect: "deny" }] }, false],
        [{ defaults: [{ permissionKey: "modules", effect: "allow" }] }, true],
        [{ defaults: [{ permissionKey: "modules", effect: "deny" }] }, false]
    ];
    for (const [assignments, expected] of cases) {
        withStrictAssignments(assignments, () => {
            assert.equal(administrativeAccess.canWrite(candidate, "modules"), expected);
        });
    }
    withStrictAssignments({ users: [{ permissionKey: "read_only", effect: "allow" }] }, () => {
        assert.equal(administrativeAccess.canRead(candidate, "modules"), true);
        assert.equal(administrativeAccess.canWrite(candidate, "modules"), false);
    });
    for (const permissionKey of ["assets", "phone", "relationships", "settings", "automations", "scenes"]) {
        withStrictAssignments({ users: [{ permissionKey, effect: "allow" }] }, () => {
            assert.equal(administrativeAccess.canWrite(candidate, "modules"), false);
        });
    }
});
