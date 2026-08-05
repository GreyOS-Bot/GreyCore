const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le parcours Relations reste complet, notifié et protégé après sa découpe",
    async () => {
        const calls = [];

        const mainDashboard = {
            character: {
                id:
                    "character",
                discord_user_id:
                    "user",
                proxy_name:
                    "Alba",
                avatar_url:
                    null
            },
            continuity: {
                id:
                    "continuity-a",
                name:
                    "GreyOS"
            }
        };

        const otherDashboard = {
            character: {
                id:
                    "other",
                discord_user_id:
                    "other-user",
                proxy_name:
                    "Billie"
            },
            continuity: {
                id:
                    "continuity-b",
                name:
                    "GreyOS"
            }
        };

        const relationship = {
            id:
                "relationship",
            continuity_a_id:
                "continuity-a",
            continuity_b_id:
                "continuity-b",
            character_a_name:
                "Alba",
            character_b_name:
                "Billie",
            note:
                "Amies de longue date",
            started_at:
                "2026-07-26"
        };

        let relationshipTypes = [
            {
                id:
                    3,
                label_a_to_b:
                    "Amie",
                label_b_to_a:
                    "Amie",
                is_symmetric:
                    true
            }
        ];

        const displayedRelationship = {
            ...relationship,
            otherCharacterName:
                "Billie",
            displayLabel:
                "Amie"
        };

        const request = {
            id:
                12,
            requester_owner_id:
                "user",
            target_owner_id:
                "other-user",
            requester_character_name:
                "Alba",
            target_character_name:
                "Billie",
            label_a_to_b:
                "Amie",
            note:
                "Une belle histoire"
        };

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
            "src/v2/managers/RelationshipV2Manager.js",
            {
                getTypes:
                    () => relationshipTypes,
                getById:
                    relationshipId =>
                        relationshipId ===
                            "foreign"
                            ? {
                                id:
                                    "foreign",
                                continuity_a_id:
                                    "continuity-x",
                                continuity_b_id:
                                    "continuity-y"
                            }
                            : relationship,
                getDisplayRelationships:
                    () => [
                        displayedRelationship
                    ],
                create:
                    data => {
                        calls.push([
                            "create",
                            data
                        ]);

                        return relationship;
                    },
                createRequest:
                    data => {
                        calls.push([
                            "request.create",
                            data
                        ]);

                        return {
                            ...request,
                            target_owner_id:
                                data.targetOwnerId
                        };
                    },
                cancelPendingRequest:
                    requestId =>
                        calls.push([
                            "request.cancel",
                            requestId
                        ]),
                acceptRequest:
                    requestId => {
                        calls.push([
                            "request.accept",
                            requestId
                        ]);

                        return {
                            request,
                            relationship
                        };
                    },
                rejectRequest:
                    requestId => {
                        calls.push([
                            "request.reject",
                            requestId
                        ]);

                        return request;
                    },
                update: (
                    relationshipId,
                    data
                ) => {
                    calls.push([
                        "update",
                        relationshipId,
                        data
                    ]);

                    return relationship;
                },
                delete:
                    relationshipId => {
                        calls.push([
                            "delete",
                            relationshipId
                        ]);

                        return relationship;
                    }
            }
        );

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getPlayableDashboardData:
                    characterId =>
                        characterId ===
                            "character"
                            ? mainDashboard
                            : otherDashboard,
                getInstalledDashboardData:
                    characterId =>
                        characterId ===
                            "character"
                            ? mainDashboard
                            : otherDashboard,
                getDashboardData:
                    characterId =>
                        characterId ===
                            "character"
                            ? mainDashboard
                            : otherDashboard,
                searchInstalledCharactersForGuild:
                    () => [
                        {
                            characterId:
                                "other",
                            character:
                                otherDashboard
                                    .character,
                            continuity:
                                otherDashboard
                                    .continuity
                        },
                        {
                            characterId:
                                "zoe",
                            character: {
                                proxy_name:
                                    "Zoé"
                            },
                            continuity: {
                                name:
                                    "GreyOS"
                            }
                        }
                    ]
            }
        );

        stubModule(
            "src/v2/pages/character/CharacterRelationshipsPage.js",
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

        stubModule(
            "src/v2/core/policies/CharacterManagementPolicy.js",
            {
                isOwner:
                    (
                        interaction,
                        character
                    ) =>
                        String(
                            interaction.user.id
                        ) ===
                        String(
                            character
                                .discord_user_id
                        ),
                canManage:
                    (
                        interaction,
                        character
                    ) =>
                        String(
                            interaction.user.id
                        ) ===
                        String(
                            character
                                .discord_user_id
                        )
            }
        );

        const handler =
            require(
                "../src/v2/interactions/relationships/RelationshipV2Handler"
            );

        assert.deepEqual(
            Object.keys(handler).sort(),
            [
                "acceptRequest",
                "confirmDelete",
                "create",
                "createFromContext",
                "delete",
                "edit",
                "openAdd",
                "openDetails",
                "openEdit",
                "openManage",
                "rejectRequest",
                "search",
                "selectCharacter",
                "selectType",
                "selectTypePage"
            ]
        );

        const addInteraction =
            createInteraction(
                calls
            );

        await handler.openAdd(
            addInteraction,
            "character"
        );

        assert.equal(
            addInteraction.modal
                .toJSON()
                .custom_id,
            "v2_relationship_search:character"
        );

        const searchInteraction =
            createInteraction(
                calls
            );

        await handler.search(
            searchInteraction,
            "character"
        );

        const searchMenu =
            searchInteraction.replied
                .components[0]
                .toJSON();

        assert.equal(
            searchMenu.components[0]
                .custom_id,
            "v2_relationship_character:character"
        );

        assert.deepEqual(
            searchMenu.components[0]
                .options
                .map(option =>
                    option.label
                ),
            [
                "Billie",
                "Zoé"
            ]
        );

        const characterSelection =
            createInteraction(
                calls
            );

        await handler.selectCharacter(
            characterSelection,
            "character",
            "other"
        );

        assert.equal(
            customIds(
                characterSelection.updated
            ).includes(
                "v2_relationship_type:character"
            ),
            true
        );

        relationshipTypes = [];

        const unavailableTypes =
            createInteraction(
                calls
            );

        await handler.selectCharacter(
            unavailableTypes,
            "character",
            "other"
        );

        assert.match(
            unavailableTypes.updated.content,
            /installer-relations/
        );

        assert.equal(
            customIds(
                unavailableTypes.updated
            ).includes(
                "page:character:relationships:character"
            ),
            true
        );

        relationshipTypes = [
            {
                id:
                    3,
                label_a_to_b:
                    "Amie",
                label_b_to_a:
                    "Amie",
                is_symmetric:
                    true
            }
        ];

        const typeSelection =
            createInteraction(
                calls
            );

        await handler.selectType(
            typeSelection,
            "character",
            "other",
            "3"
        );

        const relationModalId =
            typeSelection.modal
                .toJSON()
                .custom_id;

        assert.match(
            relationModalId,
            /^v2_rel_create:[a-f0-9]{16}$/
        );

        assert.ok(
            relationModalId.length <= 100
        );

        const createRequestInteraction =
            createInteraction(
                calls
            );

        await handler.createFromContext(
            createRequestInteraction,
            relationModalId.split(":")[1]
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                    "request.create"
            ),
            true
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "dm"
                    && call[1] ===
                        "other-user"
            ),
            true
        );

        assert.match(
            createRequestInteraction
                .replied
                .content,
            /Demande envoyée/
        );

        otherDashboard
            .character
            .discord_user_id =
                "user";

        const requestCountBefore =
            calls.filter(
                call =>
                    call[0] ===
                        "request.create"
            ).length;

        const dmCountBefore =
            calls.filter(
                call =>
                    call[0] ===
                        "dm"
            ).length;

        const sameOwnerInteraction =
            createInteraction(
                calls
            );

        await handler.create(
            sameOwnerInteraction,
            "continuity-a",
            "continuity-b",
            "3"
        );

        assert.equal(
            calls.filter(
                call =>
                    call[0] ===
                        "request.create"
            ).length,
            requestCountBefore
        );

        assert.equal(
            calls.filter(
                call =>
                    call[0] ===
                        "dm"
            ).length,
            dmCountBefore
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "create"
                    && call[1]
                        .characterAId ===
                        "character"
                    && call[1]
                        .characterBId ===
                        "other"
            ),
            true
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "page"
                    && call[1] ===
                        "character"
            ),
            true
        );

        otherDashboard
            .character
            .discord_user_id =
                "other-user";

        const acceptInteraction =
            createInteraction(
                calls,
                "other-user"
            );

        await handler.acceptRequest(
            acceptInteraction,
            "12"
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "request.accept"
                    && call[1] ===
                        12
            ),
            true
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "dm"
                    && call[1] ===
                        "user"
            ),
            true
        );

        const manageInteraction =
            createInteraction(
                calls
            );

        await handler.openManage(
            manageInteraction,
            "character"
        );

        assert.equal(
            customIds(
                manageInteraction.updated
            ).includes(
                "v2_relationship_manage_select:character"
            ),
            true
        );

        const detailsInteraction =
            createInteraction(
                calls
            );

        await handler.openDetails(
            detailsInteraction,
            "character",
            "relationship"
        );

        assert.equal(
            customIds(
                detailsInteraction.updated
            ).includes(
                "v2_relationship_edit:character:relationship"
            ),
            true
        );

        assert.equal(
            detailsInteraction.updated
                .components[0]
                .toJSON()
                .components[0]
                .label,
            "Modifier les détails"
        );

        const editInteraction =
            createInteraction(
                calls
            );

        await handler.openEdit(
            editInteraction,
            "character",
            "relationship"
        );

        assert.equal(
            editInteraction.modal
                .toJSON()
                .custom_id,
            "v2_relationship_edit_submit:character:relationship"
        );

        const foreignInteraction =
            createInteraction(
                calls
            );

        await handler.openEdit(
            foreignInteraction,
            "character",
            "foreign"
        );

        assert.equal(
            foreignInteraction.modal,
            undefined
        );

        assert.match(
            foreignInteraction
                .replied
                .content,
            /Relation introuvable/
        );

        const submitInteraction =
            createInteraction(
                calls
            );

        await handler.edit(
            submitInteraction,
            "character",
            "relationship"
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
            createInteraction(
                calls
            );

        await handler.confirmDelete(
            confirmInteraction,
            "character",
            "relationship"
        );

        assert.equal(
            customIds(
                confirmInteraction
                    .updated
            ).includes(
                "v2_relationship_delete_confirm:character:relationship"
            ),
            true
        );

        await handler.delete(
            createInteraction(
                calls
            ),
            "character",
            "relationship"
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "delete"
                    && call[1] ===
                        "relationship"
            ),
            true
        );
    }
);

function createInteraction(
    calls,
    userId = "user"
) {
    const values = {
        query:
            "bi",
        note:
            "Une belle histoire",
        started_at:
            "2026-07-26"
    };

    return {
        guildId:
            "guild",
        user: {
            id:
                userId
        },
        memberPermissions:
            null,
        client: {
            users: {
                fetch:
                    async targetUserId => ({
                        send:
                            async payload => {
                                calls.push([
                                    "dm",
                                    targetUserId,
                                    payload
                                ]);
                            }
                    })
            }
        },
        fields: {
            getTextInputValue:
                fieldId =>
                    values[fieldId]
                    || ""
        },
        inGuild:
            () => true,
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

function customIds(
    payload
) {
    return (
        payload?.components
        || []
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
