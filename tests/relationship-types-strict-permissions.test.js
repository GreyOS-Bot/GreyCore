const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");
const { stubModule } = require("./helpers/moduleStub");

test("2C.7d garde les deux commandes avant tout effet métier", async () => {
    let allowed = false;
    const decisions = [];
    const effects = [];

    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            return { allowed };
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async (interaction, message) => {
            interaction.error = message;
        }
    });
    stubModule("src/managers/RelationshipTypeManager.js", {
        createType: data => {
            effects.push(["create", data]);
            return {
                label_a_to_b: data.labelAToB,
                label_b_to_a: data.labelBToA
            };
        }
    });
    stubModule("src/managers/RelationshipManager.js", {
        installDefaultRelationshipTypes: guildId => {
            effects.push(["defaults", guildId]);
            return [{ key: "friend" }];
        }
    });

    const relationType = fresh("../src/commands/relationtype");
    const installRelations = fresh("../src/commands/installRelations");

    const deniedCreate = interaction();
    const deniedInstall = interaction();
    await relationType.execute(deniedCreate);
    await installRelations.execute(deniedInstall);
    assert.equal(effects.length, 0);
    assert.match(deniedCreate.error, /relationships\/write/);
    assert.match(deniedInstall.error, /relationships\/write/);

    assert.equal(decisions.length, 2);
    assert.ok(decisions.every(options =>
        options.permission === "relationships"
        && options.write === true
        && !("legacyCanAccessParity" in options)
        && !("allowValidationBridge" in options)
    ));

    allowed = true;
    const allowedCreate = interaction();
    const allowedInstall = interaction();
    await relationType.execute(allowedCreate);
    await installRelations.execute(allowedInstall);
    assert.deepEqual(effects, [
        ["create", {
            guildId: "guild",
            key: "mentor",
            labelAToB: "Mentor de",
            labelBToA: "Élève de",
            isSymmetric: false
        }],
        ["defaults", "guild"]
    ]);
    assert.match(allowedCreate.payload.content, /Mentor de \/ Élève de/);
    assert.match(allowedInstall.payload.content, /1 types de relations/);
});

test("2C.7d applique roots, allow, deny, defaults, read_only et isolation", () => {
    let scenario = {};
    stubModule("src/v2/managers/StaffPermissionV2Manager.js", {
        getPermissionAssignmentsForRoles: guildId => {
            if (scenario.expectedGuild) assert.equal(guildId, scenario.expectedGuild);
            return scenario.roles || [];
        },
        getUserPermissionAssignments: guildId => {
            if (scenario.expectedGuild) assert.equal(guildId, scenario.expectedGuild);
            return scenario.users || [];
        },
        getPermissionDefaults: guildId => {
            if (scenario.expectedGuild) assert.equal(guildId, scenario.expectedGuild);
            return scenario.defaults || [];
        }
    });
    stubModule("src/v2/core/services/ValidationBridgeQualificationService.js", {
        qualify: () => {
            throw new Error("le Validation Bridge ne doit pas être consulté");
        }
    });
    const decisionPath = require.resolve(
        "../src/v2/core/services/StaffPermissionDecisionService"
    );
    delete require.cache[decisionPath];
    const decisionService = require(decisionPath);
    const decide = overrides => decisionService.decide({
        interaction: strictInteraction(overrides),
        permission: "relationships",
        write: true
    }).allowed;

    scenario = {};
    assert.equal(decide({ userId: "owner" }), true);
    assert.equal(decide({ administrator: true }), true);
    assert.equal(decide({ manageGuild: true, viewChannel: true }), false);

    scenario = { users: [assignment("read_only", "allow")] };
    assert.equal(decide({}), false);
    scenario = { users: [assignment("relationships", "allow")] };
    assert.equal(decide({}), true);
    scenario = { users: [assignment("relationships", "deny")] };
    assert.equal(decide({}), false);
    scenario = { roles: [roleAssignment("relationships", "allow")] };
    assert.equal(decide({}), true);
    scenario = { roles: [roleAssignment("relationships", "deny")] };
    assert.equal(decide({}), false);
    scenario = { defaults: [assignment("relationships", "allow")] };
    assert.equal(decide({}), true);
    scenario = { defaults: [assignment("relationships", "deny")] };
    assert.equal(decide({}), false);
    scenario = { users: [assignment("characters", "allow")] };
    assert.equal(decide({}), false);

    scenario = {
        expectedGuild: "guild-a",
        users: [assignment("relationships", "allow")]
    };
    assert.equal(decide({ guildId: "guild-a" }), true);
    scenario = { expectedGuild: "guild-b" };
    assert.equal(decide({ guildId: "guild-b" }), false);
});

test("2C.7d retire les autorités legacy des deux commandes", () => {
    const forbidden =
        /StaffCommandAccessService|ValidationStaffPolicy|GuildManagementPolicy|ManageGuild|legacyCanAccessParity|allowValidationBridge/;
    for (const file of [
        "src/commands/relationtype/index.js",
        "src/commands/installRelations.js"
    ]) {
        assert.doesNotMatch(
            fs.readFileSync(path.resolve(file), "utf8"),
            forbidden
        );
    }
});

function fresh(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(resolved);
}

function interaction() {
    const value = {
        guildId: "guild",
        guild: { id: "guild" },
        options: {
            getSubcommand: () => "creer",
            getString: name => ({
                cle: "mentor",
                a_vers_b: "Mentor de",
                b_vers_a: "Élève de"
            })[name],
            getBoolean: () => false
        },
        reply: async payload => { value.payload = payload; }
    };
    return value;
}

function strictInteraction({
    guildId = "guild",
    userId = "member",
    administrator = false,
    manageGuild = false,
    viewChannel = false
} = {}) {
    return {
        guildId,
        guild: { id: guildId, ownerId: "owner" },
        user: { id: userId },
        member: {
            user: { id: userId },
            roles: { cache: new Map([["role", {}]]) },
            permissions: {
                has: permission =>
                    (administrator && permission === PermissionFlagsBits.Administrator)
                    || (manageGuild && permission === PermissionFlagsBits.ManageGuild)
                    || (viewChannel && permission === PermissionFlagsBits.ViewChannel)
            }
        },
        memberPermissions: {
            has: permission =>
                (administrator && permission === PermissionFlagsBits.Administrator)
                || (manageGuild && permission === PermissionFlagsBits.ManageGuild)
                || (viewChannel && permission === PermissionFlagsBits.ViewChannel)
        }
    };
}

function assignment(permissionKey, effect) {
    return { permissionKey, effect };
}

function roleAssignment(permissionKey, effect) {
    return { roleId: "role", permissionKey, effect };
}
