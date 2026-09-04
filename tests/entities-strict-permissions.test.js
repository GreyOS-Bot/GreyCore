const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");
const { stubModule } = require("./helpers/moduleStub");

test("2C.7h applique la matrice stricte entities en lecture et écriture", () => {
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
        interaction: strictInteraction(overrides), permission: "entities", write
    }).allowed;

    scenario = {};
    assert.equal(decide(false, { userId: "owner" }), true);
    assert.equal(decide(true, { administrator: true }), true);
    assert.equal(decide(false, { manageGuild: true, viewChannel: true }), false);
    assert.equal(decide(true, { manageGuild: true, viewChannel: true }), false);

    scenario = { users: [assignment("read_only", "allow")] };
    assert.equal(decide(false), true);
    assert.equal(decide(true), false);
    scenario = { users: [assignment("entities", "allow")] };
    assert.equal(decide(false), true);
    assert.equal(decide(true), true);
    scenario = { users: [assignment("entities", "deny")] };
    assert.equal(decide(false), false);
    assert.equal(decide(true), false);
    scenario = { roles: [roleAssignment("entities", "allow")] };
    assert.equal(decide(true), true);
    scenario = { roles: [roleAssignment("entities", "deny")] };
    assert.equal(decide(false), false);
    scenario = { defaults: [assignment("entities", "allow")] };
    assert.equal(decide(true), true);
    scenario = { defaults: [assignment("entities", "deny")] };
    assert.equal(decide(false), false);
    scenario = { users: [assignment("characters", "allow")] };
    assert.equal(decide(false), false);
    scenario = { users: [assignment("entities", "allow")] };
    assert.equal(service.decide({
        interaction: strictInteraction({ guildId: "other" }),
        permission: "entities", write: true
    }).allowed, true);
    assert.equal(requestedGuild, "other");
});

test("2C.7h protège l’entrée de section par entities/read", async () => {
    let allowed = false;
    const decisions = [];
    let executions = 0;
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => { decisions.push(options); return { allowed }; }
    });
    stubModule("src/v2/pages/staff/StaffEntitiesPage.js", {
        execute: async () => { executions += 1; }
    });
    const page = fresh("../src/v2/pages/staff/StaffSectionPage");
    const interaction = { update: async payload => { interaction.payload = payload; } };
    await page.execute(interaction, "entities");
    assert.equal(executions, 0);
    assert.match(interaction.payload.content, /pas accès/);
    allowed = true;
    await page.execute(interaction, "entities");
    assert.equal(executions, 1);
    assert.equal(decisions.length, 2);
    for (const decision of decisions) {
        assert.equal(decision.permission, "entities");
        assert.equal(decision.write, false);
        assert.equal("legacyCanAccessParity" in decision, false);
        assert.equal("allowValidationBridge" in decision, false);
    }
});

test("2C.7h refuse toutes les mutations bouton avant leurs effets", async () => {
    const effects = [];
    stubEntityDependencies(false, effects);
    const router = fresh("../src/v2/router/buttons/StaffEntityRouter");
    for (const customId of [
        "v2_staff_entities_create", "v2_staff_entities_broadcast",
        "v2_staff_entities_broadcast_cancel", "v2_staff_entities_broadcast_compose",
        "v2_staff_entities_event_create:id", "v2_staff_entities_event_toggle:id",
        "v2_staff_entities_event_delete:id", "v2_staff_entities_edit:id",
        "v2_staff_entities_expressions:id", "v2_staff_entities_toggle:id",
        "v2_staff_entities_delete:id", "v2_staff_entities_delete_confirm:id"
    ]) {
        effects.length = 0;
        await router(buttonInteraction(customId, effects));
        assert.deepEqual(effects, ["deny"], customId);
    }
});

test("2C.7h conserve les lectures bouton mais les revalide en entities/read", async () => {
    const effects = [];
    const decisions = [];
    stubEntityDependencies(true, effects, decisions);
    const router = fresh("../src/v2/router/buttons/StaffEntityRouter");
    for (const customId of [
        "v2_staff_entities_open:id", "v2_staff_entities_events:id",
        "v2_staff_entities_event_open:id"
    ]) {
        effects.length = 0;
        decisions.length = 0;
        await router(buttonInteraction(customId, effects));
        assert.equal(effects.at(-1), "update");
        assert.deepEqual(decisions.map(item => item.write), [false]);
    }
});

test("2C.7h refuse les mutations select avant brouillon ou manager", async () => {
    const effects = [];
    stubEntityDependencies(false, effects);
    const router = fresh("../src/v2/router/selects/StaffEntitySelectRouter");
    for (const customId of [
        "v2_staff_entities_broadcast_entities", "v2_staff_entities_broadcast_channels",
        "v2_staff_entities_event_scopes:id", "v2_staff_entities_triggers:id",
        "v2_staff_entities_scopes:id"
    ]) {
        effects.length = 0;
        await router(selectInteraction(customId, effects));
        assert.deepEqual(effects, ["deny"], customId);
    }
});

test("2C.7h revalide un submit broadcast forgé ou après retrait du droit avant tout effet", async () => {
    const effects = [];
    let allowed = true;
    stubEntityDependencies(() => allowed, effects);
    const buttonRouter = fresh("../src/v2/router/buttons/StaffEntityRouter");
    await buttonRouter(buttonInteraction("v2_staff_entities_broadcast", effects));
    assert.equal(effects.includes("draftClear"), true);
    allowed = false;
    effects.length = 0;
    const router = fresh("../src/v2/router/modals/StaffEntityModalRouter");
    const interaction = modalInteraction("v2_staff_entities_broadcast_submit", effects);
    interaction.guild = { channels: { fetch: async () => effects.push("fetch") } };
    await router(interaction);
    assert.deepEqual(effects, ["deny"]);
});

test("2C.7h refuse chaque mutation modal avant manager, upload ou champs", async () => {
    const effects = [];
    stubEntityDependencies(false, effects);
    const router = fresh("../src/v2/router/modals/StaffEntityModalRouter");
    for (const customId of [
        "v2_staff_entities_create_submit", "v2_staff_entities_edit_submit:id",
        "v2_staff_entities_expressions_submit:id",
        "v2_staff_entities_event_create_submit:id"
    ]) {
        effects.length = 0;
        await router(modalInteraction(customId, effects));
        assert.deepEqual(effects, ["deny"], customId);
    }
});

test("2C.7h retire les autorités legacy de tout le domaine Entity", () => {
    const forbidden = /StaffPermissionPolicy|PermissionFlagsBits\.ManageGuild|legacyCanAccessParity|allowValidationBridge|ValidationBridge/;
    for (const file of [
        "src/v2/pages/staff/StaffEntitiesPage.js",
        "src/v2/router/buttons/StaffEntityRouter.js",
        "src/v2/router/selects/StaffEntitySelectRouter.js",
        "src/v2/router/modals/StaffEntityModalRouter.js"
    ]) assert.doesNotMatch(fs.readFileSync(path.resolve(file), "utf8"), forbidden, file);
});

function stubEntityDependencies(allowed, effects, decisions = []) {
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            assert.equal(options.permission, "entities");
            return {
                allowed: options.write
                    ? (typeof allowed === "function" ? allowed() : allowed)
                    : true
            };
        }
    });
    const effect = name => () => { effects.push(name); return { id: "id", entity_id: "entity" }; };
    stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
        getById: effect("get"), create: effect("create"), update: effect("update"),
        delete: effect("delete"), toggle: effect("toggle"),
        setExpressions: effect("expressions"), setTriggers: effect("triggers"),
        setScopes: effect("scopes")
    });
    stubModule("src/v2/managers/NarrativeEntityEventManager.js", {
        getById: effect("eventGet"), create: effect("eventCreate"),
        delete: effect("eventDelete"), toggle: effect("eventToggle"),
        setScopes: effect("eventScopes")
    });
    stubModule("src/v2/pages/staff/StaffEntitiesPage.js", {
        build: effect("build"), buildDetail: effect("detail"),
        buildEvents: effect("events"), buildEventDetail: effect("eventDetail"),
        buildBroadcast: effect("broadcast")
    });
    stubModule("src/v2/services/entities/NarrativeEntityBroadcastDraftService.js", {
        get: effect("draftGet"), update: effect("draftUpdate"), clear: effect("draftClear")
    });
    stubModule("src/v2/services/entities/NarrativeEntityService.js", {
        sendEntity: effect("send")
    });
    stubModule("src/v2/services/outfits/OutfitImageStorageService.js", {
        isImage: effect("image")
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => effects.push("deny"),
        deferPrivate: async () => effects.push("defer"),
        editOrReplyError: async () => effects.push("editError")
    });
}

function buttonInteraction(customId, effects) {
    return {
        customId, guildId: "guild", user: { id: "user" }, isButton: () => true,
        update: async () => effects.push("update"),
        showModal: async () => effects.push("modal")
    };
}

function selectInteraction(customId, effects) {
    return {
        customId, guildId: "guild", user: { id: "user" }, values: ["id"],
        update: async () => effects.push("update")
    };
}

function modalInteraction(customId, effects) {
    return {
        customId, guildId: "guild", user: { id: "user" }, isModalSubmit: () => true,
        fields: {
            getTextInputValue: () => { effects.push("field"); return "value"; },
            getUploadedFiles: () => { effects.push("upload"); return new Map(); }
        },
        update: async () => effects.push("update"),
        editReply: async () => effects.push("edit")
    };
}

function fresh(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(resolved);
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
        member: {
            user: { id: userId }, roles: { cache: new Map([["role", {}]]) },
            permissions: { has }
        }
    };
}

function assignment(permissionKey, effect) { return { permissionKey, effect }; }
function roleAssignment(permissionKey, effect) { return { roleId: "role", permissionKey, effect }; }
