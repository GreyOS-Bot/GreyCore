const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");
const { stubModule } = require("./helpers/moduleStub");

test("2C.7e garde la création et les installations avant tout effet", async () => {
    let allowed = false;
    const decisions = [];
    const effects = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            return { allowed };
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", responses());
    stubModule("src/managers/StateManager.js", {
        createStateType: data => {
            effects.push(["create", data]);
            return { name: data.name, emoji: data.emoji };
        },
        getStateTypesByGuild: guildId => {
            effects.push(["read", guildId]);
            return [];
        },
        installDefaultStateTypes: (guildId, userId) => {
            effects.push(["install", guildId, userId]);
            return [{ id: 1 }];
        }
    });
    stubModule("src/v2/managers/StateTypeV2Manager.js", {
        getStateTypesByGuild: guildId => {
            effects.push(["v2-read", guildId]);
            return [];
        },
        installDefaultStateTypes: (guildId, userId) => {
            effects.push(["v2-install", guildId, userId]);
            return [{ id: 1 }];
        }
    });

    const create = fresh("../src/commands/etattype");
    const install = fresh("../src/commands/installStates");
    const installV2 = fresh("../src/v2/interactions/buttons/installDefaultStateTypes");
    await create.execute(commandInteraction());
    await install.execute(commandInteraction());
    await installV2(buttonInteraction());
    assert.deepEqual(effects, []);
    assert.equal(decisions.length, 3);
    assert.ok(decisions.every(item =>
        item.permission === "characters"
        && item.write === true
        && !("legacyCanAccessParity" in item)
        && !("allowValidationBridge" in item)
    ));

    allowed = true;
    await create.execute(commandInteraction());
    await install.execute(commandInteraction());
    await installV2(buttonInteraction());
    assert.deepEqual(effects.map(item => item[0]), [
        "create", "read", "install", "v2-read", "v2-install"
    ]);
});

test("2C.7e applique characters/write strict aux créations et installations", () => {
    let scenario = {};
    stubModule("src/v2/managers/StaffPermissionV2Manager.js", {
        getPermissionAssignmentsForRoles: () => scenario.roles || [],
        getUserPermissionAssignments: () => scenario.users || [],
        getPermissionDefaults: () => scenario.defaults || []
    });
    stubModule("src/v2/core/services/ValidationBridgeQualificationService.js", {
        qualify: () => { throw new Error("Validation Bridge interdit"); }
    });
    const service = fresh("../src/v2/core/services/StaffPermissionDecisionService");
    const decide = overrides => service.decide({
        interaction: strictInteraction(overrides),
        permission: "characters",
        write: true
    }).allowed;

    assert.equal(decide({ userId: "owner" }), true);
    assert.equal(decide({ administrator: true }), true);
    assert.equal(decide({ manageGuild: true, viewChannel: true }), false);
    scenario = { users: [assignment("read_only", "allow")] };
    assert.equal(decide({}), false);
    scenario = { users: [assignment("characters", "allow")] };
    assert.equal(decide({}), true);
    scenario = { users: [assignment("characters", "deny")] };
    assert.equal(decide({}), false);
    scenario = { roles: [roleAssignment("characters", "allow")] };
    assert.equal(decide({}), true);
    scenario = { roles: [roleAssignment("characters", "deny")] };
    assert.equal(decide({}), false);
    scenario = { defaults: [assignment("characters", "allow")] };
    assert.equal(decide({}), true);
    scenario = { defaults: [assignment("characters", "deny")] };
    assert.equal(decide({}), false);
    for (const domain of [
        "relationships", "settings", "logs", "automations", "scenes",
        "modules", "assets", "phone", "entities"
    ]) {
        scenario = { users: [assignment(domain, "allow")] };
        assert.equal(decide({}), false, domain);
    }
});

test("2C.7e réserve l'ouverture de suppression aux roots avant lecture", async () => {
    let root = false;
    let reads = 0;
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canManagePermissions: () => root
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", responses());
    stubModule("src/managers/StateManager.js", {
        getStateTypeById: () => {
            reads += 1;
            return { id: 7, guildId: "guild", name: "Blessé" };
        },
        countStatesUsingType: () => 2
    });
    const command = fresh("../src/commands/deleteStateType");
    const denied = commandInteraction();
    await command.execute(denied);
    assert.equal(reads, 0);
    assert.match(denied.error, /propriétaire.*administrateur/i);

    root = true;
    const granted = commandInteraction();
    await command.execute(granted);
    assert.equal(reads, 1);
    assert.match(granted.payload.content, /utilisé par \*\*2 état/);
    assert.match(granted.payload.components[0].components[0].data.custom_id,
        /^state_type_delete_confirm:7$/);
});

test("2C.7e rejoue root au clic, puis préserve isolation et suppression", async () => {
    let root = false;
    let guildId = "guild";
    let reads = 0;
    let deletes = 0;
    stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canManagePermissions: () => root
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", responses());
    stubModule("src/v2/managers/StateTypeV2Manager.js", {
        getStateTypeById: () => {
            reads += 1;
            return { id: 7, guildId, name: "Blessé" };
        },
        deleteStateType: () => { deletes += 1; }
    });
    for (const dependency of [
        "src/v2/interactions/buttons/installDefaultStateTypes.js",
        "src/v2/interactions/buttons/openStateAdd.js",
        "src/v2/actions/states/openEditState.js",
        "src/v2/actions/states/confirmDeleteState.js",
        "src/v2/actions/states/deleteState.js",
        "src/v2/actions/states/selectManagedState.js",
        "src/v2/actions/states/openStateManager.js"
    ]) stubModule(dependency, Object.assign(async () => {}, { execute: async () => {} }));

    const router = fresh("../src/v2/router/buttons/StateRouter");
    const denied = buttonInteraction("state_type_delete_confirm:7");
    await router(denied);
    assert.equal(reads, 0);
    assert.equal(deletes, 0);

    root = true;
    guildId = "other-guild";
    const isolated = buttonInteraction("state_type_delete_confirm:7");
    await router(isolated);
    assert.equal(reads, 1);
    assert.equal(deletes, 0);

    guildId = "guild";
    const granted = buttonInteraction("state_type_delete_confirm:7");
    await router(granted);
    assert.equal(deletes, 1);
    assert.match(granted.updated.content, /Blessé.*supprimé/);
});

test("2C.7e root signifie uniquement owner ou Administrator", () => {
    const policy = fresh("../src/v2/core/policies/StaffPermissionPolicy");
    assert.equal(policy.canManagePermissions(strictInteraction({ userId: "owner" })), true);
    assert.equal(policy.canManagePermissions(strictInteraction({ administrator: true })), true);
    assert.equal(policy.canManagePermissions(strictInteraction({ manageGuild: true })), false);
    assert.equal(policy.canManagePermissions(strictInteraction({ viewChannel: true })), false);
});

test("2C.7e couvre tous les handlers State Type et retire les autorités interdites", () => {
    const files = [
        "src/commands/etattype/index.js",
        "src/commands/installStates.js",
        "src/commands/deleteStateType.js",
        "src/v2/interactions/buttons/installDefaultStateTypes.js",
        "src/v2/router/buttons/StateRouter.js",
        "src/v2/router/modals/StaffModalRouter.js",
        "src/v2/router/buttons/StaffRouter.js",
        "src/v2/router/selects/StaffSelectRouter.js"
    ];
    const combined = files.map(file => fs.readFileSync(path.resolve(file), "utf8")).join("\n");
    assert.doesNotMatch(combined,
        /StaffCommandAccessService|ValidationStaffPolicy|GuildManagementPolicy|ManageGuild|allowValidationBridge/);
    assert.match(fs.readFileSync(path.resolve(files[5]), "utf8"),
        /v2_staff_universe_create_state_submit[\s\S]*permission: "characters"[\s\S]*createStateType/);
    assert.match(fs.readFileSync(path.resolve(files[6]), "utf8"),
        /v2_staff_universe_install_states[\s\S]*permission: "characters"[\s\S]*installDefaultStateTypes/);
    assert.match(fs.readFileSync(path.resolve(files[7]), "utf8"),
        /v2_staff_universe_delete_state:[\s\S]*canManagePermissions[\s\S]*deleteStateType/);
});

function fresh(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(resolved);
}

function responses() {
    return {
        replyError: async (interaction, message) => { interaction.error = message; },
        replyPrivate: async (interaction, message) => { interaction.private = message; }
    };
}

function commandInteraction() {
    const interaction = {
        guildId: "guild",
        guild: { id: "guild", ownerId: "owner" },
        user: { id: "member" },
        options: {
            getSubcommand: () => "creer",
            getString: name => ({ nom: "Blessé", emoji: "🤕", couleur: "#ED4245", type: "7" })[name]
        },
        reply: async payload => { interaction.payload = payload; }
    };
    return interaction;
}

function buttonInteraction(customId = "v2_state_types_install") {
    const interaction = {
        customId,
        guildId: "guild",
        guild: { id: "guild", ownerId: "owner" },
        user: { id: "member" },
        isButton: () => true,
        update: async payload => { interaction.updated = payload; }
    };
    return interaction;
}

function strictInteraction({
    guildId = "guild", userId = "member", administrator = false,
    manageGuild = false, viewChannel = false
} = {}) {
    const has = permission =>
        (administrator && permission === PermissionFlagsBits.Administrator)
        || (manageGuild && permission === PermissionFlagsBits.ManageGuild)
        || (viewChannel && permission === PermissionFlagsBits.ViewChannel);
    return {
        guildId,
        guild: { id: guildId, ownerId: "owner" },
        user: { id: userId },
        member: {
            user: { id: userId },
            roles: { cache: new Map([["role", {}]]) },
            permissions: { has }
        },
        memberPermissions: { has }
    };
}

function assignment(permissionKey, effect) {
    return { permissionKey, effect };
}

function roleAssignment(permissionKey, effect) {
    return { roleId: "role", permissionKey, effect };
}
