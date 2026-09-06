const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");
const { stubModule } = require("./helpers/moduleStub");

test("2C.7f calcule characters/write avant le resolver sans bloquer le proxy naturel", async () => {
    const order = [];
    let allowed = false;
    let resolverInput;
    stubModule("src/services/proxyService.js", {
        parseProxy: () => ({ character: "Ino", content: "Bonjour" })
    });
    stubModule("src/v2/services/moderation/UserPlayBlockService.js", {
        get: () => null
    });
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            order.push("decision");
            assert.equal(options.permission, "characters");
            assert.equal(options.write, true);
            assert.equal(options.guild.id, "guild");
            assert.equal(options.member.id, "member");
            assert.equal(options.userId, "user");
            assert.equal("legacyCanAccessParity" in options, false);
            assert.equal("allowValidationBridge" in options, false);
            return { allowed };
        }
    });
    stubModule("src/services/proxy/ProxyCharacterResolver.js", {
        resolveProxyCharacter: input => {
            order.push("resolver");
            resolverInput = input;
            return { character: null, v2Installation: null };
        },
        resolveCharacterByReference: () => null
    });
    const handler = fresh("../src/events/handlers/messageCreate/ProxyMessageHandler");
    assert.equal(await handler(proxyMessage()), false);
    assert.deepEqual(order, ["decision", "resolver"]);
    assert.equal(resolverInput.isStaff, false);

    order.length = 0;
    allowed = true;
    assert.equal(await handler(proxyMessage()), false);
    assert.deepEqual(order, ["decision", "resolver"]);
    assert.equal(resolverInput.isStaff, true);
});

test("2C.7f conserve le play block avant toute décision staff", async () => {
    let decisions = 0;
    let resolved = 0;
    stubModule("src/services/proxyService.js", {
        parseProxy: () => ({ character: "Chef", content: "Bonjour" })
    });
    stubModule("src/v2/services/moderation/UserPlayBlockService.js", {
        get: () => ({ reason: "Pause" })
    });
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: () => { decisions += 1; return { allowed: true }; }
    });
    stubModule("src/services/proxy/ProxyCharacterResolver.js", {
        resolveProxyCharacter: () => { resolved += 1; return {}; },
        resolveCharacterByReference: () => null
    });
    const handler = fresh("../src/events/handlers/messageCreate/ProxyMessageHandler");
    const message = proxyMessage();
    assert.equal(await handler(message), true);
    assert.equal(decisions, 0);
    assert.equal(resolved, 0);
    assert.match(message.replied, /temporairement suspendu/);
});

test("2C.7f préserve le duo et exige scenes/write avant ACK pour le fallback", async () => {
    let allowed = false;
    let duoUser = "duo-user";
    const effects = [];
    const decisions = [];
    const duo = {
        duo_id: "duo", guild_id: "guild", thread_id: "thread",
        male_user_id: duoUser, female_user_id: "other"
    };
    stubModule("src/v2/services/greyfate/GreyFateIntegrationService.js", {
        enabled: () => true,
        duo: () => duo,
        sceneStart: async () => {
            effects.push("sceneStart");
            return { duplicate: true };
        },
        sendAsWeaver: async () => effects.push("send")
    });
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            return { allowed };
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyPrivate: async () => effects.push("private")
    });
    const router = fresh("../src/v2/router/buttons/GreyFateRouter");

    await router(greyFateInteraction("duo-user", effects));
    assert.equal(decisions.length, 0);
    assert.deepEqual(effects, ["defer", "sceneStart", "private"]);

    effects.length = 0;
    await assert.rejects(
        router(greyFateInteraction("outsider", effects)),
        /réservée au duo ou au staff/
    );
    assert.deepEqual(effects, []);
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].permission, "scenes");
    assert.equal(decisions[0].write, true);
    assert.equal("legacyCanAccessParity" in decisions[0], false);
    assert.equal("allowValidationBridge" in decisions[0], false);

    effects.length = 0;
    allowed = true;
    await router(greyFateInteraction("outsider", effects));
    assert.deepEqual(effects, ["defer", "sceneStart", "private"]);
});

test("2C.7f conserve l'isolation GreyFate avant décision et effet", async () => {
    let decisions = 0;
    const effects = [];
    stubModule("src/v2/services/greyfate/GreyFateIntegrationService.js", {
        enabled: () => true,
        duo: () => ({
            duo_id: "duo", guild_id: "other-guild", thread_id: "thread",
            male_user_id: "one", female_user_id: "two"
        })
    });
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: () => { decisions += 1; return { allowed: true }; }
    });
    const router = fresh("../src/v2/router/buttons/GreyFateRouter");
    await assert.rejects(
        router(greyFateInteraction("outsider", effects)),
        /ne correspond pas à cette scène/
    );
    assert.equal(decisions, 0);
    assert.deepEqual(effects, []);
});

test("2C.7f applique les matrices strictes characters et scenes", () => {
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
    const decide = (permission, overrides) => service.decide({
        interaction: strictInteraction(overrides), permission, write: true
    }).allowed;

    for (const permission of ["characters", "scenes"]) {
        scenario = {};
        assert.equal(decide(permission, { userId: "owner" }), true);
        assert.equal(decide(permission, { administrator: true }), true);
        assert.equal(decide(permission, { manageGuild: true, viewChannel: true }), false);
        scenario = { users: [assignment("read_only", "allow")] };
        assert.equal(decide(permission), false);
        scenario = { users: [assignment(permission, "allow")] };
        assert.equal(decide(permission), true);
        scenario = { users: [assignment(permission, "deny")] };
        assert.equal(decide(permission), false);
        scenario = { roles: [roleAssignment(permission, "allow")] };
        assert.equal(decide(permission), true);
        scenario = { roles: [roleAssignment(permission, "deny")] };
        assert.equal(decide(permission), false);
        scenario = { defaults: [assignment(permission, "allow")] };
        assert.equal(decide(permission), true);
        scenario = { defaults: [assignment(permission, "deny")] };
        assert.equal(decide(permission), false);
        scenario = { users: [assignment(
            permission === "characters" ? "scenes" : "characters", "allow"
        )] };
        assert.equal(decide(permission), false);
    }
});

test("2C.7f retire toutes les autorités legacy des deux fichiers", () => {
    const forbidden =
        /ValidationStaffPolicy|canManageServerTools|PermissionFlagsBits\.ManageGuild|legacyCanAccessParity|allowValidationBridge/;
    for (const file of [
        "src/events/handlers/messageCreate/ProxyMessageHandler.js",
        "src/v2/router/buttons/GreyFateRouter.js"
    ]) assert.doesNotMatch(fs.readFileSync(path.resolve(file), "utf8"), forbidden);
});

function fresh(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(resolved);
}

function proxyMessage() {
    const message = {
        id: "message", content: "Ino: Bonjour",
        guild: { id: "guild", ownerId: "owner" },
        member: { id: "member", roles: { cache: new Map() } },
        author: { id: "user" }, client: {},
        reply: async text => { message.replied = text; }
    };
    return message;
}

function greyFateInteraction(userId, effects) {
    return {
        customId: "greyfate_scene_start:duo:any",
        guildId: "guild", channelId: "thread", channel: { id: "thread" },
        guild: { id: "guild", ownerId: "owner" },
        user: { id: userId }, member: { roles: { cache: new Map() } },
        isButton: () => true,
        deferUpdate: async () => effects.push("defer"),
        editReply: async () => effects.push("edit")
    };
}

function strictInteraction({
    userId = "member", administrator = false,
    manageGuild = false, viewChannel = false
} = {}) {
    const has = permission =>
        (administrator && permission === PermissionFlagsBits.Administrator)
        || (manageGuild && permission === PermissionFlagsBits.ManageGuild)
        || (viewChannel && permission === PermissionFlagsBits.ViewChannel);
    return {
        guildId: "guild", guild: { id: "guild", ownerId: "owner" },
        user: { id: userId }, memberPermissions: { has },
        member: {
            user: { id: userId }, roles: { cache: new Map([["role", {}]]) },
            permissions: { has }
        }
    };
}

function assignment(permissionKey, effect) {
    return { permissionKey, effect };
}

function roleAssignment(permissionKey, effect) {
    return { roleId: "role", permissionKey, effect };
}
