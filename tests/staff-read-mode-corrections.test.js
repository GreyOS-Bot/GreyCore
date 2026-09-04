const test = require("node:test");
const assert = require("node:assert/strict");

function stubModule(relativePath, exports) {
    const path = require.resolve(`../${relativePath}`);
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
    return path;
}

test("2B.2c ouvre les consultations avec read_only sans mutation", async context => {
    const calls = [];
    const policyPath = stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canAccess: (interaction, permission, options) => {
            calls.push({ permission, options, customId: interaction.customId });
            return options?.write === false;
        },
        canManageCharacters: () => false
    });
    const decisionPath = stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: ({ interaction, permission, write }) => {
            calls.push({ permission, options: { write }, customId: interaction.customId });
            return { allowed: write === false };
        }
    });
    const administrativeAccessPath = stubModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        {
            canRead: (interaction, permission) => {
                calls.push({ permission, options: { write: false }, customId: interaction.customId });
                return true;
            }
        }
    );
    const correctionPath = stubModule("src/v2/services/character/CharacterTypeCorrectionService.js", {
        getForStaff: () => ({ id: "character", character_type: "personnage_joue" })
    });
    const correctionViewPath = stubModule("src/v2/views/character/StaffCharacterCorrectionView.js", {
        build: () => ({ content: "character" })
    });
    const publicPlacesPath = stubModule("src/v2/services/publicPlaces/PublicPlaceForumService.js", {
        get: () => [{ channel_id: "place" }],
        synchronize: () => { throw new Error("synchronize ne doit pas être appelé"); }
    });
    const publicPlacesViewPath = stubModule("src/v2/views/staff/StaffPublicPlacesView.js", {
        build: () => ({ content: "place" })
    });
    const blocksPath = stubModule("src/v2/services/moderation/UserPlayBlockService.js", {
        list: () => []
    });
    const selectRouterPath = require.resolve("../src/v2/router/selects/StaffSelectRouter");
    const commandPath = require.resolve("../src/commands/blocage");
    delete require.cache[selectRouterPath];
    delete require.cache[commandPath];
    context.after(() => {
        for (const path of [
            policyPath, decisionPath, administrativeAccessPath, correctionPath, correctionViewPath, publicPlacesPath,
            publicPlacesViewPath, blocksPath, selectRouterPath, commandPath
        ]) delete require.cache[path];
    });

    const router = require(selectRouterPath);
    const characterInteraction = {
        customId: "v2_staff_characters_manage_character",
        guildId: "guild",
        values: ["character"],
        update: async payload => { characterInteraction.payload = payload; }
    };
    assert.equal(await router(characterInteraction), true);
    assert.equal(characterInteraction.payload.content, "character");

    const placeInteraction = {
        customId: "v2_staff_public_place_pick:forum:0",
        guildId: "guild",
        values: ["place"],
        guild: { channels: { fetch: async () => ({ id: "forum" }) } },
        update: async payload => { placeInteraction.payload = payload; }
    };
    assert.equal(await router(placeInteraction), true);
    assert.equal(placeInteraction.payload.content, "place");

    const command = require(commandPath);
    const listInteraction = {
        guildId: "guild",
        customId: null,
        options: { getSubcommand: () => "liste" },
        reply: async payload => { listInteraction.payload = payload; }
    };
    await command.execute(listInteraction);
    assert.ok(listInteraction.payload);

    assert.deepEqual(calls, [
        { permission: "characters", options: { write: false }, customId: "v2_staff_characters_manage_character" },
        { permission: "scenes", options: { write: false }, customId: "v2_staff_public_place_pick:forum:0" },
        { permission: "characters", options: { write: false }, customId: null }
    ]);
});

test("2B.2c refuse sans droit avant toute lecture", async context => {
    let reads = 0;
    const policyPath = stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canAccess: () => false,
        canManageCharacters: () => false
    });
    const decisionPath = stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: () => ({ allowed: false })
    });
    const administrativeAccessPath = stubModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        { canRead: () => false }
    );
    const correctionPath = stubModule("src/v2/services/character/CharacterTypeCorrectionService.js", {
        getForStaff: () => { reads += 1; }
    });
    const blocksPath = stubModule("src/v2/services/moderation/UserPlayBlockService.js", {
        list: () => { reads += 1; return []; }
    });
    const selectRouterPath = require.resolve("../src/v2/router/selects/StaffSelectRouter");
    const commandPath = require.resolve("../src/commands/blocage");
    delete require.cache[selectRouterPath];
    delete require.cache[commandPath];
    context.after(() => {
        for (const path of [policyPath, decisionPath, administrativeAccessPath, correctionPath, blocksPath, selectRouterPath, commandPath]) {
            delete require.cache[path];
        }
    });
    const router = require(selectRouterPath);
    const denied = {
        customId: "v2_staff_characters_manage_character",
        guildId: "guild",
        values: ["character"],
        reply: async () => {}
    };
    assert.equal(await router(denied), true);

    const command = require(commandPath);
    await command.execute({
        guildId: "guild",
        options: { getSubcommand: () => "liste" },
        reply: async () => {}
    });
    assert.equal(reads, 0);
});

test("2B.2c conserve bloquer et débloquer sous characters write:true", async context => {
    const actions = [];
    const policyPath = stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
        canAccess: () => true,
        canManageCharacters: interaction => {
            actions.push(interaction.options.getSubcommand());
            return false;
        }
    });
    const decisionPath = stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: ({ interaction, permission, write }) => {
            assert.equal(permission, "characters");
            assert.equal(write, true);
            actions.push(interaction.options.getSubcommand());
            return { allowed: false };
        }
    });
    const blocksPath = stubModule("src/v2/services/moderation/UserPlayBlockService.js", {
        list: () => { throw new Error("liste inattendue"); }
    });
    const commandPath = require.resolve("../src/commands/blocage");
    delete require.cache[commandPath];
    context.after(() => {
        for (const path of [policyPath, decisionPath, blocksPath, commandPath]) delete require.cache[path];
    });
    const command = require(commandPath);
    for (const action of ["bloquer", "debloquer"]) {
        await command.execute({
            guildId: "guild",
            options: { getSubcommand: () => action },
            reply: async () => {}
        });
    }
    assert.deepEqual(actions, ["bloquer", "debloquer"]);
});
