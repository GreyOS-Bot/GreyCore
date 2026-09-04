const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");
const { stubModule } = require("./helpers/moduleStub");

test("2C.7i applique la matrice stricte characters read/write", () => {
    let scenario = {};
    let requestedGuild;
    stubModule("src/v2/managers/StaffPermissionV2Manager.js", {
        getPermissionAssignmentsForRoles: guildId => {
            requestedGuild = guildId;
            return scenario.roles || [];
        },
        getUserPermissionAssignments: guildId => {
            requestedGuild = guildId;
            return scenario.users || [];
        },
        getPermissionDefaults: guildId => {
            requestedGuild = guildId;
            return scenario.defaults || [];
        }
    });
    stubModule("src/v2/core/services/ValidationBridgeQualificationService.js", {
        qualify: () => { throw new Error("Validation Bridge interdit"); }
    });
    const service = fresh("../src/v2/core/services/StaffPermissionDecisionService");
    const decide = (write, overrides) => service.decide({
        interaction: strictInteraction(overrides), permission: "characters", write
    }).allowed;

    assert.equal(decide(false, { userId: "owner" }), true);
    assert.equal(decide(true, { administrator: true }), true);
    assert.equal(decide(false, { manageGuild: true, viewChannel: true }), false);
    assert.equal(decide(true, { manageGuild: true, viewChannel: true }), false);
    scenario = { users: [assignment("read_only", "allow")] };
    assert.equal(decide(false), true);
    assert.equal(decide(true), false);
    scenario = { users: [assignment("characters", "allow")] };
    assert.equal(decide(true), true);
    scenario = { users: [assignment("characters", "deny"), assignment("read_only", "allow")] };
    assert.equal(decide(false), false);
    scenario = { roles: [roleAssignment("characters", "allow")] };
    assert.equal(decide(true), true);
    scenario = { roles: [roleAssignment("characters", "deny")] };
    assert.equal(decide(false), false);
    scenario = { defaults: [assignment("characters", "allow")] };
    assert.equal(decide(true), true);
    scenario = { defaults: [assignment("characters", "deny")] };
    assert.equal(decide(false), false);
    for (const permission of [
        "entities", "scenes", "relationships", "phone", "assets",
        "modules", "automations", "settings", "logs"
    ]) {
        scenario = { users: [assignment(permission, "allow")] };
        assert.equal(decide(false), false, permission);
    }
    scenario = { users: [assignment("characters", "allow")] };
    assert.equal(decide(true, { guildId: "guild-b" }), true);
    assert.equal(requestedGuild, "guild-b");
});

test("2C.7i garde /blocage liste en read et les mutations en write avant tout effet", async () => {
    let allowed = false;
    const decisions = [];
    const effects = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => { decisions.push(options); return { allowed }; }
    });
    stubModule("src/v2/services/moderation/UserPlayBlockService.js", {
        list: () => effects.push("list"), block: () => effects.push("block"),
        unblock: () => effects.push("unblock")
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => effects.push("deny"),
        replyPrivate: async () => effects.push("reply"),
        deferPrivate: async () => effects.push("defer")
    });
    const command = fresh("../src/commands/blocage");
    for (const action of ["liste", "bloquer", "debloquer"]) {
        effects.length = 0;
        const interaction = blockCommandInteraction(action, effects);
        await command.execute(interaction);
        assert.deepEqual(effects, ["deny"], action);
        assert.equal(decisions.at(-1).permission, "characters");
        assert.equal(decisions.at(-1).write, action !== "liste");
    }
    allowed = true;
    effects.length = 0;
    await command.execute(blockCommandInteraction("liste", effects));
    assert.deepEqual(effects, ["list", "reply"]);
});

test("2C.7i bloque tout staff non-root et exempte seulement blocage, owner et Administrator", async () => {
    let activeEffects = [];
    stubModule("src/v2/repositories/UserPlayBlockRepository.js", {
        get: () => ({ reason: "Pause" })
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => activeEffects.push("deny")
    });
    const service = fresh("../src/v2/services/moderation/UserPlayBlockService");
    for (const overrides of [
        {}, { manageGuild: true }, { viewChannel: true }
    ]) {
        const effects = [];
        activeEffects = effects;
        const interaction = playInteraction(overrides, effects);
        assert.equal(await service.blockInteraction(interaction), true);
        assert.deepEqual(effects, ["deny"]);
    }
    for (const overrides of [{ userId: "owner" }, { administrator: true }]) {
        const effects = [];
        activeEffects = effects;
        assert.equal(await service.blockInteraction(playInteraction(overrides, effects)), false);
        assert.deepEqual(effects, []);
    }
    const effects = [];
    activeEffects = effects;
    assert.equal(await service.blockInteraction(playInteraction({ commandName: "blocage" }, effects)), false);
    assert.deepEqual(effects, []);
});

test("2C.7i protège les lectures et mutations StaffRouter, y compris les confirms rejoués", async () => {
    const decisions = [];
    const effects = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => { decisions.push(options); return { allowed: false }; }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => effects.push("deny"),
        deferPrivate: async () => effects.push("defer")
    });
    const router = fresh("../src/v2/router/buttons/StaffRouter");
    const cases = [
        ["v2_staff_characters_roster", false],
        ["v2_staff_characters_statistics_global", false],
        ["v2_staff_characters_genders", false],
        ["v2_staff_characters_users", false],
        ["v2_staff_character_balance_alert:user", true],
        ["v2_staff_character_gender_set:id:female:0", true],
        ["v2_staff_characters_deploy_all", true],
        ["v2_staff_character_delete:id", true],
        ["v2_staff_character_delete_confirm:id", true],
        ["v2_staff_characters_delete_owner:user", true],
        ["v2_staff_characters_delete_owner_confirm:user", true],
        ["v2_staff_characters_archive:user", true],
        ["v2_staff_characters_restore:user", true]
    ];
    for (const [customId, write] of cases) {
        effects.length = 0;
        decisions.length = 0;
        await router(staffButton(customId, effects));
        assert.deepEqual(effects, ["deny"], customId);
        assert.equal(decisions[0].permission, "characters");
        assert.equal(decisions[0].write, write);
    }
});

test("2C.7i protège les selects staff Characters avant toute lecture", async () => {
    const effects = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            assert.equal(options.permission, "characters");
            assert.equal(options.write, false);
            return { allowed: false };
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => effects.push("deny")
    });
    const router = fresh("../src/v2/router/selects/StaffSelectRouter");
    for (const customId of [
        "v2_staff_character_gender_select:0",
        "v2_staff_characters_statistics_user_select",
        "v2_staff_characters_user_select",
        "v2_staff_characters_manage_character"
    ]) {
        effects.length = 0;
        await router({ customId, guildId: "guild", values: ["id"] });
        assert.deepEqual(effects, ["deny"], customId);
    }
});

test("2C.7i protège les deux liaisons masquées staff en write avant manager", async () => {
    const effects = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            assert.equal(options.permission, "characters");
            assert.equal(options.write, true);
            return { allowed: false };
        }
    });
    stubModule("src/v2/managers/CharacterV2Manager.js", {
        getById: () => effects.push("get"), setMaskedParent: () => effects.push("set")
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => effects.push("deny")
    });
    const characterRouter = fresh("../src/v2/router/buttons/CharacterRouter");
    await characterRouter({
        customId: "v2_staff_character_masked_link:id", guildId: "guild",
        isButton: () => true
    });
    assert.deepEqual(effects, ["deny"]);
    effects.length = 0;
    const libraryRouter = fresh("../src/v2/router/selects/LibrarySelectRouter");
    await libraryRouter({
        customId: "v2_masked_parent_link_select:id:staff", guildId: "guild",
        values: ["parent"], user: { id: "staff" }, isStringSelectMenu: () => true
    });
    assert.deepEqual(effects, ["get", "deny"]);
    assert.equal(effects.includes("set"), false);
});

test("2C.8A retire les autorités Characters legacy des parcours staff migrés", () => {
    const files = [
        "src/commands/blocage/index.js", "src/commands/personnage/index.js",
        "src/v2/pages/staff/StaffSectionPage.js",
        "src/v2/router/buttons/CharacterRouter.js",
        "src/v2/router/buttons/StaffRouter.js",
        "src/v2/router/selects/LibrarySelectRouter.js",
        "src/v2/router/selects/StaffSelectRouter.js"
    ];
    const forbidden = /canManageCharacters\(|canAccess\([^\n]*characters|canOpenCenter\(|legacyCanAccessParity|allowValidationBridge|ValidationStaffPolicy|ManageGuild/;
    for (const file of files) assert.doesNotMatch(fs.readFileSync(path.resolve(file), "utf8"), forbidden, file);
    assert.match(
        fs.readFileSync(path.resolve("src/v2/services/moderation/UserPlayBlockService.js"), "utf8"),
        /canManagePermissions\(interaction\)/
    );
});

test("2C.8A réduit CharacterManagementPolicy à l’ownership et préserve Assets strict", () => {
    const policySource = fs.readFileSync(
        path.resolve("src/v2/core/policies/CharacterManagementPolicy.js"), "utf8"
    );
    assert.doesNotMatch(policySource, /GuildManagementPolicy|isStaff\(|canManage\(|allowStaff|ManageGuild/);
    assert.match(policySource, /isOwner\(/);

    const assetsSource = fs.readFileSync(
        path.resolve("src/v2/interactions/assets/AssetAccessService.js"), "utf8"
    );
    assert.match(assetsSource, /permission:\s*"assets"/);
    assert.match(assetsSource, /isOwner\(/);
    assert.doesNotMatch(assetsSource, /permission:\s*"characters"/);
});

function blockCommandInteraction(action, effects) {
    return {
        guildId: "guild", guild: { name: "Guild" }, user: { id: "staff" },
        options: {
            getSubcommand: () => action,
            getUser: () => { effects.push("user"); return { id: "target", bot: false, send: async () => {} }; },
            getString: () => { effects.push("reason"); return "Motif"; }
        },
        editReply: async () => effects.push("edit")
    };
}

function playInteraction(overrides, effects) {
    const base = strictInteraction(overrides);
    return {
        ...base,
        commandName: overrides.commandName || "personnage",
        isAutocomplete: () => false,
        reply: async () => effects.push("deny")
    };
}

function staffButton(customId, effects) {
    return {
        customId, guildId: "guild", guild: { name: "Guild" },
        user: { id: "staff" }, isButton: () => true,
        update: async () => effects.push("update"), editReply: async () => effects.push("edit")
    };
}

function strictInteraction({
    userId = "member", guildId = "guild", administrator = false,
    manageGuild = false, viewChannel = false
} = {}) {
    const has = permission =>
        (administrator && permission === PermissionFlagsBits.Administrator)
        || (manageGuild && permission === PermissionFlagsBits.ManageGuild)
        || (viewChannel && permission === PermissionFlagsBits.ViewChannel);
    return {
        guildId, guild: { id: guildId, ownerId: "owner" }, user: { id: userId },
        memberPermissions: { has },
        member: { user: { id: userId }, roles: { cache: new Map([["role", {}]]) }, permissions: { has } }
    };
}

function assignment(permissionKey, effect) { return { permissionKey, effect }; }
function roleAssignment(permissionKey, effect) { return { roleId: "role", permissionKey, effect }; }
function fresh(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(resolved);
}
