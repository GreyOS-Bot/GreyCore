const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stubModule } = require("./helpers/moduleStub");

const commandModule = "../src/commands/personnages";
const handlerModule =
    "../src/v2/interactions/staff/StaffCharacterCorrectionHandler";

test("2C.7c conserve liste publique et garde les six actions avant leurs effets", async () => {
    let allowed = false;
    const decisions = [];
    const effects = [];

    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            return { allowed };
        }
    });
    stubModule("src/v2/managers/CharacterRosterV2Manager.js", {
        getRoster: () => [],
        archiveOwnerCharacters: () => {
            effects.push("archive");
            return { updated: [] };
        },
        restoreOwnerCharacters: () => {
            effects.push("restore");
            return { updated: [] };
        },
        deleteOwnerCharacters: () => {
            effects.push("delete-owner");
            return { deleted: [] };
        },
        deleteCharacter: () => {
            effects.push("delete-character");
            return { continuityCount: 0, installationCount: 0 };
        }
    });
    stubModule("src/v2/services/deployment/DeploymentV2Service.js", {
        deployAllExisting: () => {
            effects.push("deploy");
            return { total: 0 };
        }
    });
    stubModule("src/v2/services/character/CharacterTypeCorrectionService.js", {
        getForStaff: ({ characterId }) => {
            effects.push("get-for-staff");
            return {
                id: characterId,
                firstname: "Reya",
                discord_user_id: "owner"
            };
        }
    });
    stubModule("src/v2/views/character/StaffCharacterCorrectionView.js", {
        build: () => {
            effects.push("build-correction");
            return { content: "correction" };
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyPrivate: async (interaction, payload) => {
            interaction.payload = payload;
        },
        replyError: async (interaction, message) => {
            interaction.error = String(message);
        }
    });

    const command = fresh(commandModule);
    await command.execute(commandInteraction("liste"));
    assert.equal(decisions.length, 0);

    const staffSubcommands = [
        "deployer-tous",
        "corriger",
        "archiver",
        "restaurer",
        "supprimer",
        "supprimer-personnage"
    ];
    for (const subcommand of staffSubcommands) {
        const before = effects.length;
        const interaction = commandInteraction(subcommand, true);
        await command.execute(interaction);
        assert.equal(effects.length, before, `${subcommand} a produit un effet sans droit`);
        assert.match(interaction.error, /characters\/write/);
    }
    assert.equal(decisions.length, staffSubcommands.length);
    assert.ok(decisions.every(({ permission, write }) =>
        permission === "characters" && write === true
    ));
    assert.ok(decisions.every(options =>
        !("legacyCanAccessParity" in options)
        && !("allowValidationBridge" in options)
    ));

    allowed = true;
    for (const subcommand of staffSubcommands) {
        await command.execute(commandInteraction(subcommand, true));
    }
    assert.deepEqual(effects, [
        "deploy",
        "get-for-staff", "build-correction",
        "archive",
        "restore",
        "delete-owner",
        "get-for-staff", "delete-character"
    ]);
});

test("2C.7c ajoute le droit strict aux confirmations sans les remplacer", async () => {
    let deleteCalls = 0;
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: () => ({ allowed: true })
    });
    stubModule("src/v2/managers/CharacterRosterV2Manager.js", {
        getRoster: () => [],
        deleteOwnerCharacters: () => { deleteCalls += 1; },
        deleteCharacter: () => { deleteCalls += 1; }
    });
    stubModule("src/v2/services/character/CharacterTypeCorrectionService.js", {
        getForStaff: () => {
            throw new Error("getForStaff ne doit pas être appelé");
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyPrivate: async (interaction, payload) => {
            interaction.payload = payload;
        },
        replyError: async () => {}
    });

    const command = fresh(commandModule);
    for (const subcommand of ["supprimer", "supprimer-personnage"]) {
        const interaction = commandInteraction(subcommand, false);
        await command.execute(interaction);
        assert.match(interaction.payload, /confirmer/);
    }
    assert.equal(deleteCalls, 0);
});

test("2C.7c revalide séparément boutons, submits et select avant lecture ou mutation", async () => {
    let allowed = false;
    const decisions = [];
    let reads = 0;
    let writes = 0;

    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: options => {
            decisions.push(options);
            return { allowed };
        }
    });
    stubModule("src/v2/services/character/CharacterTypeCorrectionService.js", {
        getForStaff: () => {
            reads += 1;
            return { id: "character", proxy_name: "Reya" };
        },
        correctForStaff: () => { writes += 1; }
    });
    stubModule("src/v2/views/character/StaffCharacterCorrectionView.js", {
        build: () => ({ content: "updated" })
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async (interaction, error) => {
            interaction.error = String(error?.message || error);
        }
    });

    const handler = fresh(handlerModule);
    const actions = [
        ["openIdentity", "v2_staff_character_identity:character"],
        ["openInformation", "v2_staff_character_info:character"],
        ["submitIdentity", "v2_staff_character_identity_submit:character"],
        ["submitInformation", "v2_staff_character_info_submit:character"],
        ["selectType", "v2_staff_character_type:character"]
    ];
    for (const [method, customId] of actions) {
        const beforeReads = reads;
        const beforeWrites = writes;
        const interaction = correctionInteraction(customId);
        await handler[method](interaction);
        assert.match(interaction.error, /characters\/write/);
        assert.equal(reads, beforeReads);
        assert.equal(writes, beforeWrites);
    }
    assert.equal(decisions.length, 5);
    assert.ok(decisions.every(({ permission, write }) =>
        permission === "characters" && write === true
    ));
    assert.ok(decisions.every(options =>
        !("legacyCanAccessParity" in options)
        && !("allowValidationBridge" in options)
    ));

    allowed = true;
    await handler.openIdentity(correctionInteraction(
        "v2_staff_character_identity:character"
    ));
    allowed = false;
    await handler.submitIdentity(correctionInteraction(
        "v2_staff_character_identity_submit:character"
    ));
    await handler.selectType(correctionInteraction(
        "v2_staff_character_type:character"
    ));
    assert.equal(writes, 0, "un droit retiré ne doit jamais atteindre correctForStaff");
});

test("2C.7c ne laisse aucune autorité legacy dans les deux fichiers runtime", () => {
    const files = [
        "src/commands/personnages/index.js",
        "src/v2/interactions/staff/StaffCharacterCorrectionHandler.js"
    ];
    const forbidden =
        /StaffCommandAccessService|StaffPermissionPolicy\.canManageCharacters|legacyCanAccessParity|ValidationStaffPolicy|ManageGuild|allowValidationBridge/;
    for (const file of files) {
        const source = fs.readFileSync(path.resolve(file), "utf8");
        assert.doesNotMatch(source, forbidden);
    }
});

function fresh(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(resolved);
}

function commandInteraction(subcommand, confirmed = false) {
    const interaction = {
        guildId: "guild",
        guild: { name: "Guild" },
        user: { id: "staff" },
        options: {
            getSubcommand: () => subcommand,
            getString: name => name === "lettre" ? null : "character",
            getBoolean: name => name === "confirmer" ? confirmed : false,
            getUser: () => ({ id: "owner", toString: () => "<@owner>" })
        }
    };
    return interaction;
}

function correctionInteraction(customId) {
    return {
        customId,
        guildId: "guild",
        values: ["personnage_joue"],
        fields: {
            getTextInputValue: id => id === "age" ? "24" : "value"
        },
        showModal: async modal => { correctionInteraction.modal = modal; },
        update: async payload => { correctionInteraction.payload = payload; }
    };
}
