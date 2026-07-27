const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les biens acceptent une image envoyée directement et conservent l’ancienne sans nouvel envoi",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/managers/AssetV2Manager.js",
            {
                create: data => {
                    calls.push([
                        "create",
                        data
                    ]);

                    return {
                        name: data.name
                    };
                },
                update: (
                    assetId,
                    data
                ) => {
                    calls.push([
                        "update",
                        assetId,
                        data
                    ]);

                    return {
                        name: "Roadster"
                    };
                }
            }
        );

        stubModule(
            "src/v2/managers/AssetTypeV2Manager.js",
            {}
        );
        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {}
        );
        stubModule(
            "src/v2/pages/character/CharacterAssetsPage.js",
            {}
        );
        stubModule(
            "src/v2/interactions/assets/AssetAccessService.js",
            {
                getCharacterContext:
                    async () => ({
                        continuity: {
                            id: "continuity"
                        },
                        character: {
                            proxy_name: "Alba"
                        }
                    }),
                getAssetContext:
                    async () => ({
                        asset: {
                            id: 8
                        }
                    })
            }
        );
        stubModule(
            "src/v2/interactions/assets/AssetViewFactory.js",
            {}
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyPrivate:
                    async (
                        interaction,
                        content
                    ) => {
                        interaction.result = content;
                    },
                replyError:
                    async (
                        interaction,
                        error
                    ) => {
                        interaction.error =
                            error.message
                            || error;
                    }
            }
        );

        const handler =
            require(
                "../src/v2/interactions/assets/AssetHandler"
            );

        const createSaveInteraction =
            createInteraction({
                name: "Roadster",
                description: "Bleu nuit",
                details: "Plaque GREY-01"
            }, [
                {
                    contentType: "image/png",
                    url: "https://cdn.discordapp.com/roadster.png"
                }
            ]);

        await handler.saveCreateModal(
            createSaveInteraction,
            "character",
            4
        );

        assert.equal(
            calls[0][1].imageUrl,
            "https://cdn.discordapp.com/roadster.png"
        );

        const editInteraction =
            createInteraction({
                name: "Roadster",
                description: "Bleu nuit",
                details: "Plaque GREY-01"
            });

        await handler.saveEditModal(
            editInteraction,
            8
        );

        assert.equal(
            Object.hasOwn(
                calls[1][2],
                "imageUrl"
            ),
            false
        );
    }
);

test(
    "les formulaires de biens proposent un envoi d’image facultatif",
    () => {
        const factory =
            require(
                "../src/v2/interactions/assets/AssetModalFactory"
            );

        const create = factory
            .createAssetModal(
                "character",
                {
                    id: 4,
                    label: "Véhicule"
                }
            )
            .toJSON();

        const edit = factory
            .editAssetModal({
                id: 8,
                character_id: "character",
                name: "Roadster"
            })
            .toJSON();

        for (const modal of [
            create,
            edit
        ]) {
            const imageField =
                modal.components[3];

            assert.equal(
                imageField.component.custom_id,
                "image"
            );
            assert.equal(
                imageField.component.required,
                false
            );
        }
    }
);

function createInteraction(
    values,
    uploads = []
) {
    return {
        guildId: "guild",
        user: {
            id: "user"
        },
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
        }
    };
}
