const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les tenues gardent leur parcours complet et vérifient leur propriétaire après la découpe",
    async () => {
        const calls = [];

        const character = {
            id:
                "character",
            discord_user_id:
                "user"
        };

        const continuity = {
            id:
                "continuity",
            character_id:
                character.id
        };

        const outfits = [
            {
                id:
                    1,
                continuity_id:
                    continuity.id,
                title:
                    "Tenue actuelle",
                description:
                    "Robe noire",
                image_url:
                    "https://example.com/current.png",
                is_current:
                    1
            },
            {
                id:
                    2,
                continuity_id:
                    continuity.id,
                title:
                    "Tenue de soirée",
                description:
                    "Robe rouge",
                image_url:
                    "https://example.com/evening.png",
                is_current:
                    0
            }
        ];

        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                create:
                    data =>
                        calls.push([
                            "pending.create",
                            data
                        ])
            }
        );

        stubModule(
            "src/v2/managers/OutfitV2Manager.js",
            {
                createCurrent:
                    data => {
                        calls.push([
                            "outfit.create",
                            data
                        ]);

                        return {
                            id: 3,
                            ...data
                        };
                    },
                getById:
                    outfitId =>
                        outfits.find(
                            outfit =>
                                Number(
                                    outfit.id
                                ) ===
                                Number(outfitId)
                        )
                        || null,
                getForContinuity:
                    continuityId =>
                        outfits.filter(
                            outfit =>
                                String(
                                    outfit
                                        .continuity_id
                                ) ===
                                String(
                                    continuityId
                                )
                        ),
                updateDetails:
                    (
                        outfitId,
                        data
                    ) => {
                        calls.push([
                            "outfit.update",
                            outfitId,
                            data
                        ]);

                        return outfits.find(
                            outfit =>
                                Number(
                                    outfit.id
                                ) ===
                                Number(outfitId)
                        );
                    },
                setCurrent:
                    outfitId => {
                        calls.push([
                            "outfit.current",
                            Number(outfitId)
                        ]);

                        for (
                            const outfit
                            of outfits
                        ) {
                            outfit.is_current =
                                Number(
                                    outfit.id
                                ) ===
                                    Number(
                                        outfitId
                                    )
                                    ? 1
                                    : 0;
                        }

                        return outfits.find(
                            outfit =>
                                Number(
                                    outfit.id
                                ) ===
                                Number(outfitId)
                        );
                    },
                delete:
                    outfitId => {
                        calls.push([
                            "outfit.delete",
                            Number(outfitId)
                        ]);

                        return outfits.find(
                            outfit =>
                                Number(
                                    outfit.id
                                ) ===
                                Number(outfitId)
                        );
                    }
            }
        );

        stubModule(
            "src/v2/services/outfits/OutfitImageStorageService.js",
            {
                download:
                    async attachment => ({
                        data:
                            Buffer.from("image"),
                        filename:
                            attachment.name
                            || "outfit.png",
                        contentType:
                            attachment.contentType
                            || "image/png"
                    })
            }
        );

        stubModule(
            "src/v2/managers/ContinuityV2Manager.js",
            {
                getById:
                    continuityId =>
                        String(
                            continuityId
                        ) ===
                            continuity.id
                            ? continuity
                            : null
            }
        );

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    characterId =>
                        String(
                            characterId
                        ) ===
                            character.id
                            ? character
                            : null
            }
        );

        stubModule(
            "src/v2/core/policies/CharacterManagementPolicy.js",
            {
                isOwner:
                    (
                        interaction,
                        targetCharacter
                    ) =>
                        String(
                            interaction.user.id
                        ) ===
                        String(
                            targetCharacter
                                .discord_user_id
                        ),
                canManage:
                    (
                        interaction,
                        targetCharacter
                    ) =>
                        String(
                            interaction.user.id
                        ) ===
                        String(
                            targetCharacter
                                .discord_user_id
                        )
                        || interaction.isStaff ===
                            true
            }
        );

        stubModule(
            "src/v2/pages/character/CharacterOutfitPage.js",
            {
                execute:
                    async (
                        interaction,
                        characterId
                    ) =>
                        calls.push([
                            "outfit.page",
                            characterId
                        ])
            }
        );

        const handler =
            require(
                "../src/v2/interactions/outfits/OutfitV2Handler"
            );

        assert.deepEqual(
            Object.keys(handler).sort(),
            [
                "confirmDelete",
                "deleteConfirmed",
                "openAddModal",
                "openChangeMenu",
                "openEditModal",
                "openManageMenu",
                "openManageView",
                "saveAddModal",
                "saveEditModal",
                "setCurrent"
            ]
        );

        const addInteraction =
            createInteraction();

        await handler.openAddModal(
            addInteraction,
            continuity.id
        );

        assert.equal(
            addInteraction.modal
                .toJSON()
                .custom_id,
            "v2_outfit_add_modal:continuity"
        );

        assert.deepEqual(
            addInteraction
                .modal
                .toJSON()
                .components
                .map(
                    component =>
                        component.component
                            .custom_id
                ),
            [
                "image",
                "title",
                "description"
            ]
        );

        const addSaveInteraction =
            createInteraction(
                {
                    title:
                        "Tenue de gala",
                    description:
                        "Avec une veste noire."
                },
                "user",
                [
                    {
                        contentType:
                            "image/png",
                        url:
                            "https://example.com/gala.png"
                    }
                ]
            );

        await handler.saveAddModal(
            addSaveInteraction,
            continuity.id
        );

        assert.deepEqual(
            calls.find(
                call =>
                    call[0] ===
                    "outfit.create"
            ),
            [
                "outfit.create",
                {
                    continuityId:
                        "continuity",
                    imageUrl:
                        "https://example.com/gala.png",
                    imageData:
                        Buffer.from("image"),
                    imageFilename:
                        "outfit.png",
                    imageContentType:
                        "image/png",
                    title:
                        "Tenue de gala",
                    description:
                        "Avec une veste noire."
                }
            ]
        );

        const modalRouter =
            require(
                "../src/v2/router/modals/OutfitModalRouter"
            );

        const routedAddInteraction =
            createInteraction(
                {},
                "user",
                [
                    {
                        contentType:
                            "image/webp",
                        url:
                            "https://example.com/second.webp"
                    }
                ]
            );

        routedAddInteraction.customId =
            "v2_outfit_add_modal:continuity";
        routedAddInteraction.isModalSubmit =
            () => true;

        assert.equal(
            await modalRouter(
                routedAddInteraction
            ),
            true
        );

        assert.equal(
            calls.filter(
                call =>
                    call[0] ===
                    "outfit.create"
            ).length,
            2
        );

        const editInteraction =
            createInteraction();

        await handler.openEditModal(
            editInteraction,
            2
        );

        assert.equal(
            editInteraction.modal
                .toJSON()
                .custom_id,
            "v2_outfit_edit_modal:2"
        );

        const saveInteraction =
            createInteraction({
                title:
                    "Nouveau titre",
                description:
                    "Nouvelle description"
            });

        await handler.saveEditModal(
            saveInteraction,
            2
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "outfit.update"
                    && call[1] ===
                        2
            ),
            true
        );

        const changeInteraction =
            createInteraction();

        await handler.openChangeMenu(
            changeInteraction,
            continuity.id
        );

        assert.equal(
            customIds(
                changeInteraction.replied
            ).includes(
                "v2_outfit_change_select:continuity"
            ),
            true
        );

        const changeOptions =
            changeInteraction.replied
                .components[0]
                .toJSON()
                .components[0]
                .options;

        assert.deepEqual(
            changeOptions.map(
                option =>
                    option.value
            ),
            [
                "2"
            ]
        );

        const manageInteraction =
            createInteraction();

        await handler.openManageMenu(
            manageInteraction,
            continuity.id
        );

        assert.equal(
            customIds(
                manageInteraction.replied
            ).includes(
                "v2_outfit_manage_select:continuity"
            ),
            true
        );

        const viewInteraction =
            createInteraction();

        await handler.openManageView(
            viewInteraction,
            2
        );

        const manageIds =
            customIds(
                viewInteraction.updated
            );

        assert.equal(
            manageIds.includes(
                "v2_outfit_setcurrent:2"
            ),
            true
        );

        assert.equal(
            manageIds.includes(
                "v2_outfit_edit:2"
            ),
            true
        );

        assert.equal(
            manageIds.includes(
                "v2_outfit_delete:2"
            ),
            true
        );

        const selectHandler =
            require(
                "../src/v2/interactions/outfits/OutfitSelectMenus"
            );

        const selectInteraction =
            createInteraction();

        selectInteraction.customId =
            "v2_outfit_change_select:continuity";
        selectInteraction.values = [
            "2"
        ];

        await selectHandler(
            selectInteraction
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "outfit.current"
                    && call[1] ===
                        2
            ),
            true
        );

        const confirmInteraction =
            createInteraction();

        await handler.confirmDelete(
            confirmInteraction,
            2
        );

        assert.equal(
            customIds(
                confirmInteraction.updated
            ).includes(
                "v2_outfit_delete_confirm:2"
            ),
            true
        );

        await handler.deleteConfirmed(
            createInteraction(),
            2
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "outfit.delete"
                    && call[1] ===
                        2
            ),
            true
        );

        const deniedInteraction =
            createInteraction(
                {},
                "other-user"
            );

        const currentCallsBefore =
            calls.filter(
                call =>
                    call[0] ===
                    "outfit.current"
            ).length;

        await handler.setCurrent(
            deniedInteraction,
            1
        );

        assert.match(
            deniedInteraction
                .replied
                .content,
            /ne peux pas gérer/
        );

        assert.equal(
            calls.filter(
                call =>
                    call[0] ===
                    "outfit.current"
            ).length,
            currentCallsBefore
        );
    }
);

function createInteraction(
    values = {},
    userId = "user",
    uploads = []
) {
    return {
        guildId:
            "guild",
        channelId:
            "channel",
        user: {
            id:
                userId
        },
        memberPermissions:
            null,
        fields: {
            getTextInputValue:
                fieldId =>
                    values[fieldId]
                    || "",
            getUploadedFiles:
                () => new Map(
                    uploads.map(
                        (
                            upload,
                            index
                        ) => [
                            String(index),
                            upload
                        ]
                    )
                )
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
