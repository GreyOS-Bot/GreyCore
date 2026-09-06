const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stubModule } = require("./helpers/moduleStub");

test("2C.8B protège les sections résiduelles avec leur lecture stricte", async () => {
    const decisions = [];
    const opened = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            return { allowed: options.interaction.allowed === true };
        }
    });
    for (const [section, page] of [
        ["relationships", "StaffRelationshipsPage"],
        ["phone", "StaffPhonePage"],
        ["universe", "StaffUniversePage"]
    ]) {
        stubModule(`src/v2/pages/staff/${page}.js`, {
            execute: async () => opened.push(section)
        });
    }
    const page = fresh("../src/v2/pages/staff/StaffSectionPage");
    for (const section of ["relationships", "phone", "universe"]) {
        const denied = sectionInteraction(false);
        await page.execute(denied, section);
        assert.equal(denied.denied, true, section);
        assert.equal(opened.includes(section), false, section);

        await page.execute(sectionInteraction(true), section);
        assert.equal(opened.includes(section), true, section);
    }
    assert.deepEqual(decisions.map(({ permission, write }) => [permission, write]), [
        ["relationships", false], ["relationships", false],
        ["phone", false], ["phone", false],
        ["universe", false], ["universe", false]
    ]);
});

test("2C.8B revalide characters/write entre ouverture et submit State Type", async () => {
    let allowed = true;
    let creates = 0;
    const effects = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            assert.equal(options.permission, "characters");
            assert.equal(options.write, true);
            assert.equal("legacyCanAccessParity" in options, false);
            assert.equal("allowValidationBridge" in options, false);
            return { allowed };
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => effects.push("deny")
    });
    stubModule("src/v2/managers/StateTypeV2Manager.js", {
        createStateType: () => { creates += 1; }
    });
    const buttonRouter = fresh("../src/v2/router/buttons/StaffRouter");
    const modalRouter = fresh("../src/v2/router/modals/StaffModalRouter");

    await buttonRouter({
        isButton: () => true,
        customId: "v2_staff_universe_create_state",
        showModal: async () => effects.push("modal")
    });
    assert.deepEqual(effects, ["modal"]);

    allowed = false;
    await modalRouter(stateSubmitInteraction(effects));
    assert.deepEqual(effects, ["modal", "deny"]);
    assert.equal(creates, 0);
});

test("2C.8B garde les mutations Relationship Types derrière relationships/write", async () => {
    const decisions = [];
    const effects = [];
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            return { allowed: false };
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async () => effects.push("deny")
    });
    stubModule("src/v2/managers/RelationshipTypeV2Manager.js", {
        installDefaults: () => effects.push("install"),
        create: () => effects.push("create"),
        delete: () => effects.push("delete")
    });
    const buttons = fresh("../src/v2/router/buttons/StaffRouter");
    const modals = fresh("../src/v2/router/modals/StaffModalRouter");
    const selects = fresh("../src/v2/router/selects/StaffSelectRouter");
    await buttons(simpleButton("v2_staff_relationships_install_defaults"));
    await buttons(simpleButton("v2_staff_relationships_create_type"));
    await modals(relationshipSubmitInteraction());
    await selects({
        customId: "v2_staff_relationships_delete_type:0",
        guildId: "guild",
        values: ["7"]
    });
    assert.deepEqual(effects, ["deny", "deny", "deny", "deny"]);
    assert.ok(decisions.every(options =>
        options.permission === "relationships"
        && options.write === true
        && !("legacyCanAccessParity" in options)
        && !("allowValidationBridge" in options)
    ));
});

test("2C.8B ne réintroduit aucune autorité legacy dans les workflows migrés", () => {
    const files = [
        "src/v2/interactions/scenes/SceneInteractionHandler.js",
        "src/v2/pages/staff/StaffRelationshipsPage.js",
        "src/v2/pages/staff/StaffSectionPage.js",
        "src/v2/router/buttons/StaffRouter.js",
        "src/v2/router/modals/StaffModalRouter.js"
    ];
    const forbidden = /legacyCanAccessParity|allowValidationBridge|ValidationStaffPolicy|GuildManagementPolicy|ManageGuild|ViewChannel/;
    for (const file of files) {
        assert.doesNotMatch(fs.readFileSync(path.resolve(file), "utf8"), forbidden, file);
    }
    const universe = fs.readFileSync(
        path.resolve("src/v2/pages/staff/StaffUniversePage.js"),
        "utf8"
    );
    assert.match(universe, /permission:\s*"characters"[\s\S]*write:\s*true/);
    assert.match(universe, /canManagePermissions/);
    const selectRouter = fs.readFileSync(
        path.resolve("src/v2/router/selects/StaffSelectRouter.js"),
        "utf8"
    );
    const relationshipDelete = selectRouter.match(
        /if \(interaction\.customId\?\.startsWith\("v2_staff_relationships_delete_type:"\)\)[\s\S]*?return true;\n    }/
    )?.[0] || "";
    assert.match(relationshipDelete, /permission:\s*"relationships"[\s\S]*write:\s*true/);
    assert.doesNotMatch(relationshipDelete, forbidden);
});

function fresh(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(resolved);
}

function sectionInteraction(allowed) {
    const interaction = {
        allowed,
        guildId: "guild",
        update: async payload => {
            interaction.denied = typeof payload.content === "string"
                && payload.content.startsWith("❌");
        }
    };
    return interaction;
}

function simpleButton(customId) {
    return { isButton: () => true, customId, guildId: "guild" };
}

function stateSubmitInteraction(effects) {
    return {
        customId: "v2_staff_universe_create_state_submit",
        guildId: "guild",
        user: { id: "member" },
        fields: { getTextInputValue: () => "" },
        update: async () => effects.push("update")
    };
}

function relationshipSubmitInteraction() {
    return {
        customId: "v2_staff_relationships_create_type_submit",
        guildId: "guild",
        fields: { getTextInputValue: () => "non" }
    };
}
