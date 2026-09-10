const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le parcours Rencontres reste complet après sa découpe",
    async () => {
        const calls = [];

        const mainDashboard = {
            character: {
                id: "character",
                owner_id: "user",
                proxy_name: "Alba",
                avatar_url: null
            },
            continuity: {
                id: "continuity-a"
            },
            installation:{id:1,character_id:"character",continuity_id:"continuity-a",guild_id:"guild",context_id:"context"}
        };

        const otherDashboard = {
            character: {
                id: "other",
                owner_id: "other-user",
                proxy_name: "Billie"
            },
            continuity: {
                id: "continuity-b"
            },
            installation:{id:2,character_id:"other",continuity_id:"continuity-b",guild_id:"guild",context_id:"context"}
        };

        const rawEncounter = {
            id: "encounter",
            installation_a_id: 1,
            installation_b_id: 2,
            guild_id:"guild",context_id:"context",
            external_name: null,
            location: "Le Steel",
            note: "Première rencontre",
            occurred_at: "2026-07-26"
        };

        const decoratedEncounter = {
            ...rawEncounter,
            other_character_name:
                "Billie"
        };

        stubModule(
            "src/v2/managers/EncounterV2Manager.js",
            {
                getById:
                    () => rawEncounter,
                getForInstallationInContext:
                    () => [
                        decoratedEncounter
                    ],
                getEligibleTargets:()=>[{installation_id:2,proxy_name:"Billie",continuity_name:"B"}],
                requireInstallation:id=>Number(id)===1?mainDashboard.installation:otherDashboard.installation,
                requireScopedEncounter:()=>decoratedEncounter,
                create: data => {
                    calls.push([
                        "create",
                        data
                    ]);

                    return rawEncounter;
                },
                updateScoped: (
                    encounterId,
                    data
                ) => {
                    calls.push([
                        "update",
                        encounterId,
                        data
                    ]);

                    return rawEncounter;
                },
                deleteScoped:
                    encounterId => {
                        calls.push([
                            "delete",
                            encounterId
                        ]);

                        return rawEncounter;
                    }
            }
        );

        stubModule(
            "src/v2/managers/ContinuityV2Manager.js",
            {
                getById:
                    continuityId => ({
                        id:
                            continuityId,
                        character_id:
                            continuityId ===
                                "continuity-a"
                                ? "character"
                                : "other"
                    })
            }
        );

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getDashboardData:
                    characterId =>
                        characterId ===
                            "character"
                            ? mainDashboard
                            : otherDashboard,
                getPlayableDashboardData: characterId => characterId === "character" ? mainDashboard : otherDashboard,
                getInstalledCharactersForGuild:
                    () => [
                        {
                            characterId:
                                "character",
                            character:
                                mainDashboard
                                    .character,
                            continuity:
                                mainDashboard
                                    .continuity
                        },
                        {
                            characterId:
                                "other",
                            character:
                                otherDashboard
                                    .character,
                            continuity:
                                otherDashboard
                                    .continuity
                        }
                    ]
            }
        );

        stubModule(
            "src/v2/pages/character/CharacterEncountersPage.js",
            {
                execute:
                    async (
                        interaction,
                        characterId
                    ) => {
                        calls.push([
                            "page",
                            characterId
                        ]);
                    }
            }
        );

        const handler =
            require(
                "../src/v2/interactions/encounters/EncounterV2Handler"
            );

        assert.deepEqual(
            Object.keys(handler).sort(),
            [
                "confirmDelete",
                "createExternal",
                "createInternal",
                "delete",
                "edit",
                "openAdd",
                "openDetails",
                "openEdit",
                "openExternalModal",
                "openInternalModal",
                "openManage",
                "selectCharacter"
            ]
        );

        const addInteraction =
            createInteraction();

        await handler.openAdd(
            addInteraction,
            "1"
        );

        assert.equal(
            customIds(
                addInteraction.updated
            ).includes(
                "v2_encounter_character:1"
            ),
            true
        );

        const externalSelection =
            createInteraction();

        await handler.selectCharacter(
            externalSelection,
            "1",
            "external"
        );

        assert.equal(
            externalSelection.modal
                .toJSON()
                .custom_id,
            "v2_enc_ext:1"
        );

        const internalSelection =
            createInteraction();

        await handler.selectCharacter(
            internalSelection,
            "1",
            "2"
        );

        assert.equal(
            internalSelection.modal
                .toJSON()
                .custom_id,
            "v2_enc_int:1:2"
        );

        const createInteractionValue =
            createInteraction();

        await handler.createInternal(
            createInteractionValue,
            "1",
            "2"
        );

        const createCall =
            calls.find(
                call =>
                    call[0] ===
                    "create"
            );

        assert.equal(
            createCall[1]
                .installationAId,
            "1"
        );

        const manageInteraction =
            createInteraction();

        await handler.openManage(
            manageInteraction,
            "1"
        );

        assert.equal(
            customIds(
                manageInteraction.updated
            ).includes(
                "v2_encounter_manage_select:1"
            ),
            true
        );

        const detailsInteraction =
            createInteraction();

        await handler.openDetails(
            detailsInteraction,
            "1",
            "encounter"
        );

        const detailIds =
            customIds(
                detailsInteraction.updated
            );

        assert.equal(
            detailIds.includes(
                "v2_encounter_edit:1:encounter"
            ),
            true
        );

        assert.equal(
            detailIds.includes(
                "v2_encounter_delete:1:encounter"
            ),
            true
        );

        const forgedDetails = createInteraction("intruder");
        await handler.openDetails(forgedDetails,"1","encounter");
        assert.equal(forgedDetails.updated,undefined);
        assert.match(forgedDetails.replied.content,/ne peux pas consulter/);

        const editInteraction =
            createInteraction();

        await handler.openEdit(
            editInteraction,
            "1",
            "encounter"
        );

        assert.equal(
            editInteraction.modal
                .toJSON()
                .custom_id,
            "v2_encounter_edit_submit:1:encounter"
        );

        mainDashboard.character.owner_id = "new-owner";
        const staleSubmit = createInteraction("user");
        await handler.edit(staleSubmit,"1","encounter");
        assert.equal(staleSubmit.updated,undefined);
        assert.equal(calls.some(call => call[0] === "update"),false);
        const createCount=calls.filter(call=>call[0]==="create").length;
        await handler.createExternal(createInteraction("user"),"1");
        assert.equal(calls.filter(call=>call[0]==="create").length,createCount);
        mainDashboard.character.owner_id = "user";

        const submitInteraction =
            createInteraction();

        await handler.edit(
            submitInteraction,
            "1",
            "encounter"
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                    "update"
            ),
            true
        );

        const confirmInteraction =
            createInteraction();

        await handler.confirmDelete(
            confirmInteraction,
            "1",
            "encounter"
        );

        assert.equal(
            customIds(
                confirmInteraction
                    .updated
            ).includes(
                "v2_encounter_delete_confirm:1:encounter"
            ),
            true
        );

        await handler.delete(
            createInteraction(),
            "1",
            "encounter"
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "delete"
                    &&
                    call[1] ===
                        "encounter"
            ),
            true
        );
    }
);

function createInteraction(userId = "user") {
    const values = {
        external_name:
            "Sergueï",
        location:
            "Le Steel",
        occurred_at:
            "2026-07-26",
        note:
            "Première rencontre"
    };

    return {
        guildId:
            "guild",
        user: {
            id: userId
        },
        memberPermissions: null,
        fields: {
            getTextInputValue:
                fieldId =>
                    values[fieldId]
                    ||
                    ""
        },
        reply: async function (
            payload
        ) {
            this.replied = payload;
        },
        update: async function (
            payload
        ) {
            this.updated = payload;
        },
        showModal: async function (
            modal
        ) {
            this.modal = modal;
        }
    };
}

function customIds(payload) {
    return (
        payload?.components
        ||
        []
    ).flatMap(
        row =>
            row.toJSON()
                .components
                .map(
                    component =>
                        component.custom_id
                )
                .filter(Boolean)
    );
}
