const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const outfitManager =
    require("../../managers/OutfitV2Manager");

const outfitImagePresentation =
    require(
        "../../services/outfits/OutfitImagePresentationService"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterOutfitPage {

    async execute(
        interaction,
        characterId,
        installationId = null
    ) {
        if (String(characterId).includes("~")) {
            [characterId, installationId] = String(characterId).split("~");
        }

        const dashboardData =
            characterDashboardManager.getDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId,
                    installationId
                }
            );

        if (!dashboardData) {

            return interaction.update({

                content:
                    "❌ Ce personnage est introuvable.",

                embeds:
                    [],

                components:
                    []

            });

        }

        const {
            character,
            continuity,
            installation
        } = dashboardData;

        const isOwner =
            characterManagementPolicy
                .isOwner(
                    interaction,
                    character
                );

        const outfit =
            installation
                ? outfitManager.getCurrent(
                    installation.id
                )
                : null;

        const imageAttachment =
            outfitImagePresentation.getAttachment(
                outfit
            );

        const descriptionParts = [

            UI.components
                .characterHeader
                .build(character),

            "### 👕 Outfit"

        ];

        if (outfit) {

            descriptionParts.push(

                outfit.title
                    ? `**${outfit.title}**`
                    : "**Tenue actuelle**",

                outfit.description
                    || "Aucune description."

            );

        } else {

            descriptionParts.push(
                "Aucune tenue actuelle."
            );

        }

        const embed =
            UI.embed.create({

                title:
                    null,

                thumbnail:
                    character.avatar_url
                    || null,

                description:
                    UI.text.blocks(
                        descriptionParts
                    )

            });

        const imageUrl =
            outfitImagePresentation.getImageUrl(
                outfit,
                imageAttachment
            );

        if (imageUrl) {

            embed.setImage(
                imageUrl
            );

        }

        if (!continuity || !installation) {

    return interaction.update({

        content:
            "❌ Aucune continuité sélectionnée.",

        embeds: [],

        components: []

    });

}

        const navigationRow =
    new ActionRowBuilder()
        .addComponents(

            UI.button.secondary({

                id:
                    `page:character:home:${characterId}`,

                label:
                    "Retour",

                emoji:
                    "⬅️"

            }),

            UI.button.success({

                id:
                    `v2_outfit_add:${installation.id}`,

                label:
                    "Ajouter",

                emoji:
                    "➕"

            }),

            UI.button.primary({

                id:
                    `v2_outfit_change:${installation.id}`,

                label:
                    "Changer",

                emoji:
                    "👕"

            }),

            UI.button.secondary({

                id:
                    `v2_outfit_manage:${installation.id}`,

                label:
                    "Gérer",

                emoji:
                    "⚙️"

            })

        );

const secondaryRow =
    new ActionRowBuilder()
        .addComponents(

            UI.button.secondary({

                id:
                    `v2_outfit_edit:${outfit?.id || 0}`,

                label:
                    "Détails",

                emoji:
                    "✏️",

                disabled:
                    !outfit

            }),

            UI.components.navigation.close()

        );

        const readOnlyNavigation =
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({

                        id:
                            `page:character:home:${characterId}`,

                        label:
                            "Retour",

                        emoji:
                            "⬅️"

                    }),

                    UI.components.navigation.close()
                );

        return interaction.update({
            ...UI.page.create({

                embed,

                components:
                    isOwner
                        ? [
                            navigationRow,
                            secondaryRow
                        ]
                        : [
                            readOnlyNavigation
                        ]

            }),
            files:
                imageAttachment
                    ? [imageAttachment]
                    : [],
            attachments: []
        });

    }

}

module.exports =
    new CharacterOutfitPage();
