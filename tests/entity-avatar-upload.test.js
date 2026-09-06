const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("la création d’une Entité propose l’envoi direct de son avatar", async () => {
    stubCommon();
    const routerPath = require.resolve("../src/v2/router/buttons/StaffEntityRouter");
    delete require.cache[routerPath];
    const router = require(routerPath);
    const interaction = {
        customId: "v2_staff_entities_create",
        isButton: () => true,
        showModal: async modal => { interaction.modal = modal.toJSON(); }
    };

    assert.equal(await router(interaction), true);
    const allComponents = flatten(interaction.modal.components);
    assert.equal(
        allComponents.some(component => component.custom_id === "avatar" && component.type === 19),
        true
    );
});

test("l’avatar envoyé est enregistré sur l’Entité", async () => {
    const calls = [];
    stubCommon({
        create: data => {
            calls.push(data);
            return { id: "entity" };
        }
    });
    const routerPath = require.resolve("../src/v2/router/modals/StaffEntityModalRouter");
    delete require.cache[routerPath];
    const router = require(routerPath);
    const values = {
        name: "Le Gardien",
        color: "#5865F2",
        description: "",
        messages: "Un chapitre commence."
    };
    const interaction = {
        customId: "v2_staff_entities_create_submit",
        guildId: "guild",
        user: { id: "staff" },
        isModalSubmit: () => true,
        fields: {
            getUploadedFiles: () => new Map([["avatar", {
                name: "gardien.png",
                contentType: "image/png",
                url: "https://cdn.discordapp.com/gardien.png"
            }]]),
            getTextInputValue: id => values[id] || ""
        },
        update: async () => {}
    };

    assert.equal(await router(interaction), true);
    assert.equal(calls[0].avatarUrl, "https://cdn.discordapp.com/gardien.png");
});

function stubCommon(manager = {}) {
    stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
        decide: () => ({ allowed: true })
    });
    stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
        getById: () => null,
        ...manager
    });
    stubModule("src/v2/pages/staff/StaffEntitiesPage.js", {
        buildDetail: () => ({ embeds: [], components: [] })
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: async (interaction, error) => { interaction.error = error; }
    });
}

function flatten(components) {
    return components.flatMap(component => [
        component,
        ...flatten(component.components || [component.component].filter(Boolean))
    ]);
}
