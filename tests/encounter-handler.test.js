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
            }
        };

        const otherDashboard = {
            character: {
                id: "other",
                owner_id: "other-user",
                proxy_name: "Billie"
            },
            continuity: {
                id: "continuity-b"
            }
        };

        const rawEncounter = {
            id: "encounter",
            continuity_a_id:
                "continuity-a",
            continuity_b_id:
                "continuity-b",
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
                getForContinuity:
                    () => [
                        decoratedEncounter
                    ],
                create: data => {
                    calls.push([
                        "create",
                        data
                    ]);

                    return rawEncounter;
                },
                update: (
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
                delete:
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
                getPlayableDashboardData:
                    characterId =>
                        characterId ===
                            "character"
                            ? mainDashboard
                            : otherDashboard,
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
            "character"
        );

        assert.equal(
            customIds(
                addInteraction.updated
            ).includes(
                "v2_encounter_character:character"
            ),
            true
        );

        const externalSelection =
            createInteraction();

        await handler.selectCharacter(
            externalSelection,
            "character",
            "external"
        );

        assert.equal(
            externalSelection.modal
                .toJSON()
                .custom_id,
            "v2_enc_ext:continuity-a"
        );

        const internalSelection =
            createInteraction();

        await handler.selectCharacter(
            internalSelection,
            "character",
            "other"
        );

        assert.equal(
            internalSelection.modal
                .toJSON()
                .custom_id,
            "v2_enc_int:continuity-a:continuity-b"
        );

        const createInteractionValue =
            createInteraction();

        await handler.createInternal(
            createInteractionValue,
            "continuity-a",
            "continuity-b"
        );

        const createCall =
            calls.find(
                call =>
                    call[0] ===
                    "create"
            );

        assert.equal(
            createCall[1]
                .continuityAId,
            "continuity-a"
        );

        const manageInteraction =
            createInteraction();

        await handler.openManage(
            manageInteraction,
            "character"
        );

        assert.equal(
            customIds(
                manageInteraction.updated
            ).includes(
                "v2_encounter_manage_select:character"
            ),
            true
        );

        const detailsInteraction =
            createInteraction();

        await handler.openDetails(
            detailsInteraction,
            "character",
            "encounter"
        );

        const detailIds =
            customIds(
                detailsInteraction.updated
            );

        assert.equal(
            detailIds.includes(
                "v2_encounter_edit:character:encounter"
            ),
            true
        );

        assert.equal(
            detailIds.includes(
                "v2_encounter_delete:character:encounter"
            ),
            true
        );

        const editInteraction =
            createInteraction();

        await handler.openEdit(
            editInteraction,
            "character",
            "encounter"
        );

        assert.equal(
            editInteraction.modal
                .toJSON()
                .custom_id,
            "v2_encounter_edit_submit:character:encounter"
        );

        const submitInteraction =
            createInteraction();

        await handler.edit(
            submitInteraction,
            "character",
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
            "character",
            "encounter"
        );

        assert.equal(
            customIds(
                confirmInteraction
                    .updated
            ).includes(
                "v2_encounter_delete_confirm:character:encounter"
            ),
            true
        );

        await handler.delete(
            createInteraction(),
            "character",
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

function createInteraction() {
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
            id: "user"
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
