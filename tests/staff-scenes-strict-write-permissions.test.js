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

function deniedInteraction(customId, kind) {
    return {
        customId,
        guildId: "guild",
        user: { id: "member", username: "Member" },
        values: ["value"],
        fields: {
            getTextInputValue: () => {
                throw new Error("fields must not be read when access is denied");
            }
        },
        isButton: () => kind === "button",
        isModalSubmit: () => kind === "modal",
        update: async () => {
            throw new Error("business update must not run when access is denied");
        },
        showModal: async () => {
            throw new Error("modal must not open when access is denied");
        },
        deferUpdate: async () => {
            throw new Error("Discord synchronization must not run when access is denied");
        },
        guild: {
            channels: {
                fetch: async () => {
                    throw new Error("Discord fetch must not run when access is denied");
                }
            }
        },
        channel: {
            get parent() {
                throw new Error("channel hierarchy must not be inspected when access is denied");
            }
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
        throw new Error("Validation Bridge must stay disabled for Scenes");
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

test("2C.6d4 protège chaque mutation Scenes et Public Places avant tout effet", async context => {
    const accessCalls = [];
    const errors = [];
    const restoreAccess = replaceModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        {
            canRead: () => true,
            canWrite: (interaction, permission) => {
                accessCalls.push([interaction.customId, permission]);
                return false;
            }
        }
    );
    const restoreResponse = replaceModule(
        "src/v2/core/services/InteractionResponseService.js",
        { replyError: async interaction => errors.push(interaction.customId) }
    );
    context.after(() => {
        restoreAccess();
        restoreResponse();
    });

    const buttonIds = [
        "v2_staff_scenes_configure",
        "v2_staff_scenes_toggle",
        "v2_staff_scenes_add_expression",
        "v2_staff_scenes_add_zone",
        "v2_staff_scenes_add_current_category",
        "v2_staff_scenes_new_cycle",
        "v2_staff_public_places_refresh:forum"
    ];
    const selectIds = [
        "v2_staff_scenes_public_forum_select",
        "v2_staff_public_place_category:forum:place:0",
        "v2_staff_scenes_remove_zone",
        "v2_staff_scenes_remove_expression",
        "v2_staff_scenes_zone_select"
    ];
    const modalIds = [
        "v2_staff_scenes_config_submit",
        "v2_staff_scenes_expression_submit"
    ];
    const loaded = [
        loadRouter("src/v2/router/buttons/StaffRouter.js"),
        loadRouter("src/v2/router/selects/StaffSelectRouter.js"),
        loadRouter("src/v2/router/modals/StaffModalRouter.js")
    ];
    context.after(() => loaded.forEach(({ resolved }) => delete require.cache[resolved]));

    for (const id of buttonIds) {
        assert.equal(await loaded[0].router(deniedInteraction(id, "button")), true);
    }
    for (const id of selectIds) {
        assert.equal(await loaded[1].router(deniedInteraction(id, "select")), true);
    }
    for (const id of modalIds) {
        assert.equal(await loaded[2].router(deniedInteraction(id, "modal")), true);
    }

    const allIds = [...buttonIds, ...selectIds, ...modalIds];
    assert.deepEqual(accessCalls, allIds.map(id => [id, "scenes"]));
    assert.deepEqual(errors, allIds);
});

test("2C.6d4 retire les autorités legacy des mutations Scenes et Public Places", () => {
    const button = fs.readFileSync(path.join(
        __dirname, "../src/v2/router/buttons/StaffRouter.js"
    ), "utf8");
    const select = fs.readFileSync(path.join(
        __dirname, "../src/v2/router/selects/StaffSelectRouter.js"
    ), "utf8");
    const modal = fs.readFileSync(path.join(
        __dirname, "../src/v2/router/modals/StaffModalRouter.js"
    ), "utf8");

    assert.match(button, /v2_staff_scenes_[\s\S]*canWrite\(interaction, "scenes"\)/);
    assert.match(button, /v2_staff_public_places_refresh:[\s\S]*canWrite\(interaction, "scenes"\)/);
    assert.match(select, /v2_staff_scenes_public_forum_select[\s\S]*canWrite\(interaction, "scenes"\)/);
    assert.match(select, /v2_staff_public_place_category:[\s\S]*canWrite\(interaction, "scenes"\)/);
    assert.match(select, /v2_staff_scenes_remove_zone[\s\S]*canWrite\(interaction, "scenes"\)/);
    assert.match(select, /v2_staff_scenes_zone_select[\s\S]*canWrite\(interaction, "scenes"\)/);
    assert.match(modal, /v2_staff_scenes_[\s\S]*canWrite\(interaction, "scenes"\)/);
    for (const source of [button, select, modal]) {
        assert.doesNotMatch(source, /allowValidationBridge\s*:\s*true/);
    }
});

test("2C.6d4 applique roots, allow deny defaults, read_only et isolation cross-domain", () => {
    assert.equal(administrativeAccess.canWrite(strictInteraction({ owner: true }), "scenes"), true);
    assert.equal(administrativeAccess.canWrite(strictInteraction({ administrator: true }), "scenes"), true);

    const candidate = strictInteraction();
    const cases = [
        [{ users: [{ permissionKey: "scenes", effect: "allow" }] }, true],
        [{ users: [{ permissionKey: "scenes", effect: "deny" }] }, false],
        [{ roles: [{ roleId: "role", permissionKey: "scenes", effect: "allow" }] }, true],
        [{ roles: [{ roleId: "role", permissionKey: "scenes", effect: "deny" }] }, false],
        [{ defaults: [{ permissionKey: "scenes", effect: "allow" }] }, true],
        [{ defaults: [{ permissionKey: "scenes", effect: "deny" }] }, false]
    ];
    for (const [assignments, expected] of cases) {
        withStrictAssignments(assignments, () => {
            assert.equal(administrativeAccess.canWrite(candidate, "scenes"), expected);
        });
    }

    withStrictAssignments({ users: [{ permissionKey: "read_only", effect: "allow" }] }, () => {
        assert.equal(administrativeAccess.canRead(candidate, "scenes"), true);
        assert.equal(administrativeAccess.canWrite(candidate, "scenes"), false);
    });
    for (const permissionKey of ["settings", "logs", "automations", "modules"]) {
        withStrictAssignments({ users: [{ permissionKey, effect: "allow" }] }, () => {
            assert.equal(administrativeAccess.canWrite(candidate, "scenes"), false);
        });
    }
});
