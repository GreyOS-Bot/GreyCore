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
    const interaction = {
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
        deferReply: async () => {
            throw new Error("defer must not run when access is denied");
        },
        channel: {
            send: async () => {
                throw new Error("Discord send must not run when access is denied");
            }
        }
    };
    return interaction;
}

function strictInteraction() {
    return {
        guildId: "guild",
        guild: { id: "guild", ownerId: "owner", channels: { cache: new Map() } },
        user: { id: "member" },
        member: {
            user: { id: "member" },
            roles: { cache: new Map([["role", {}]]) },
            permissions: { has: () => false }
        },
        memberPermissions: { has: () => false }
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
        throw new Error("Validation Bridge must stay disabled for Automations");
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

test("2C.6d3 protège chaque mutation Automations avant tout effet", async context => {
    const accessCalls = [];
    const errors = [];
    const restoreAccess = replaceModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        {
            canWrite: (interaction, permission) => {
                accessCalls.push([interaction.customId, permission]);
                return false;
            }
        }
    );
    const restoreResponse = replaceModule(
        "src/v2/core/services/InteractionResponseService.js",
        {
            replyError: async (interaction) => errors.push(interaction.customId),
            deferPrivate: async () => {
                throw new Error("announcement must not defer when access is denied");
            },
            editOrReplyError: async (interaction) => errors.push(interaction.customId)
        }
    );
    context.after(() => {
        restoreAccess();
        restoreResponse();
    });

    const buttonIds = [
        "v2_staff_automations_configure_approval",
        "v2_staff_automations_approval_details",
        "v2_staff_automations_cancel_approval",
        "v2_staff_automations_creation_limit",
        "v2_staff_automations_toggle_limit",
        "v2_staff_automations_disable_approval",
        "v2_staff_automations_announcement"
    ];
    const selectIds = [
        "v2_staff_automations_required_role",
        "v2_staff_automations_remove_role",
        "v2_staff_automations_add_role",
        "v2_staff_automations_welcome_channel"
    ];
    const staffModalIds = [
        "v2_staff_automations_approval_submit",
        "v2_staff_automations_creation_limit_submit"
    ];

    const loaded = [
        loadRouter("src/v2/router/buttons/StaffRouter.js"),
        loadRouter("src/v2/router/selects/StaffSelectRouter.js"),
        loadRouter("src/v2/router/modals/StaffModalRouter.js"),
        loadRouter("src/v2/router/modals/AnnouncementModalRouter.js")
    ];
    context.after(() => loaded.forEach(({ resolved }) => delete require.cache[resolved]));

    for (const id of buttonIds) {
        assert.equal(await loaded[0].router(deniedInteraction(id, "button")), true);
    }
    for (const id of selectIds) {
        assert.equal(await loaded[1].router(deniedInteraction(id, "select")), true);
    }
    for (const id of staffModalIds) {
        assert.equal(await loaded[2].router(deniedInteraction(id, "modal")), true);
    }
    assert.equal(
        await loaded[3].router(deniedInteraction("v2_announcement_submit", "modal")),
        true
    );

    const allIds = [...buttonIds, ...selectIds, ...staffModalIds, "v2_announcement_submit"];
    assert.deepEqual(accessCalls, allIds.map(id => [id, "automations"]));
    assert.deepEqual(errors, allIds);
});

test("2C.6d3 revalide les submits et bloque les IDs rejoués après retrait du droit", async context => {
    let allowed = true;
    let sends = 0;
    let draftReads = 0;
    let databaseWrites = 0;
    const restoreAccess = replaceModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        { canWrite: () => allowed }
    );
    const restoreResponse = replaceModule(
        "src/v2/core/services/InteractionResponseService.js",
        {
            replyError: async () => {},
            deferPrivate: async () => {},
            editOrReplyError: async () => {}
        }
    );
    const restoreDraft = replaceModule(
        "src/v2/services/automation/ApprovalAutomationDraftService.js",
        { get: () => { draftReads += 1; return null; }, clear: () => {}, update: () => {} }
    );
    const restoreApproval = replaceModule(
        "src/v2/managers/CharacterApprovalAutomationV2Manager.js",
        { configure: () => { databaseWrites += 1; } }
    );
    context.after(() => {
        restoreAccess();
        restoreResponse();
        restoreDraft();
        restoreApproval();
    });

    const staffModal = loadRouter("src/v2/router/modals/StaffModalRouter.js");
    const announcement = loadRouter("src/v2/router/modals/AnnouncementModalRouter.js");
    context.after(() => {
        delete require.cache[staffModal.resolved];
        delete require.cache[announcement.resolved];
    });

    allowed = false;
    for (const id of [
        "v2_staff_automations_approval_submit",
        "v2_staff_automations_creation_limit_submit"
    ]) {
        await staffModal.router(deniedInteraction(id, "modal"));
    }
    const replayedAnnouncement = deniedInteraction("v2_announcement_submit", "modal");
    replayedAnnouncement.channel.send = async () => { sends += 1; };
    await announcement.router(replayedAnnouncement);

    assert.equal(draftReads, 0);
    assert.equal(databaseWrites, 0);
    assert.equal(sends, 0);
});

test("2C.6d3 retire les autorités legacy de tous les handlers Automations WRITE", () => {
    const files = [
        "src/v2/router/buttons/StaffRouter.js",
        "src/v2/router/selects/StaffSelectRouter.js",
        "src/v2/router/modals/StaffModalRouter.js",
        "src/v2/router/modals/AnnouncementModalRouter.js"
    ];
    const sources = files.map(file => fs.readFileSync(path.join(__dirname, "..", file), "utf8"));

    for (const source of sources) {
        assert.doesNotMatch(source, /allowValidationBridge\s*:\s*true/);
    }
    const announcement = sources[3];
    assert.match(announcement, /AdministrativePermissionAccessService/);
    assert.match(announcement, /canWrite\(interaction, "automations"\)/);
    assert.doesNotMatch(
        announcement,
        /StaffCommandAccessService|StaffPermissionPolicy|ValidationStaffPolicy|GuildManagementPolicy|ManageGuild/
    );

    assert.match(sources[0], /v2_staff_automations_[\s\S]*canWrite\(interaction, "automations"\)/);
    assert.match(sources[1], /v2_staff_automations_[\s\S]*canWrite\(interaction, "automations"\)/);
    assert.match(sources[2], /approval_submit[\s\S]*canWrite\(interaction, "automations"\)/);
    assert.match(sources[2], /creation_limit_submit[\s\S]*canWrite\(interaction, "automations"\)/);
});

test("2C.6d3 conserve la lecture Automations stricte et indépendante du WRITE", () => {
    const section = fs.readFileSync(path.join(
        __dirname,
        "../src/v2/pages/staff/StaffSectionPage.js"
    ), "utf8");
    assert.match(section, /STRICT_ADMINISTRATIVE_SECTIONS[\s\S]*"automations"/);
    assert.match(section, /administrativeAccess\.canRead\(interaction, permissionKey\)/);
});

test("2C.6d3 applique allow deny defaults read_only et l'isolation cross-domain", () => {
    const candidate = strictInteraction();
    const cases = [
        [{ users: [{ permissionKey: "automations", effect: "allow" }] }, true],
        [{ users: [{ permissionKey: "automations", effect: "deny" }] }, false],
        [{ roles: [{ roleId: "role", permissionKey: "automations", effect: "allow" }] }, true],
        [{ roles: [{ roleId: "role", permissionKey: "automations", effect: "deny" }] }, false],
        [{ defaults: [{ permissionKey: "automations", effect: "allow" }] }, true],
        [{ defaults: [{ permissionKey: "automations", effect: "deny" }] }, false]
    ];
    for (const [assignments, expected] of cases) {
        withStrictAssignments(assignments, () => {
            assert.equal(administrativeAccess.canWrite(candidate, "automations"), expected);
        });
    }

    withStrictAssignments({
        users: [{ permissionKey: "read_only", effect: "allow" }]
    }, () => {
        assert.equal(administrativeAccess.canRead(candidate, "automations"), true);
        assert.equal(administrativeAccess.canWrite(candidate, "automations"), false);
    });

    for (const permissionKey of ["settings", "logs", "scenes", "modules"]) {
        withStrictAssignments({
            users: [{ permissionKey, effect: "allow" }]
        }, () => {
            assert.equal(administrativeAccess.canWrite(candidate, "automations"), false);
        });
    }
});
