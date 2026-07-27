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

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterOutfitPage {

    async execute(
        interaction,
        characterId
    ) {

        const dashboardData =
            characterDashboardManager.getDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId
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
            continuity
        } = dashboardData;

        const isOwner =
            characterManagementPolicy
                .isOwner(
                    interaction,
                    character
                );

        const outfit =
            continuity
                ? outfitManager.getCurrent(
                    continuity.id
                )
                : null;

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

        if (outfit?.image_url) {

            embed.setImage(
                outfit.image_url
            );

        }

        if (!continuity) {

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
                    `page:character:category:character:${characterId}`,

                label:
                    "Retour",

                emoji:
                    "⬅️"

            }),

            UI.button.success({

                id:
                    `v2_outfit_add:${continuity.id}`,

                label:
                    "Ajouter",

                emoji:
                    "➕"

            }),

            UI.button.primary({

                id:
                    `v2_outfit_change:${continuity.id}`,

                label:
                    "Changer",

                emoji:
                    "👕"

            }),

            UI.button.secondary({

                id:
                    `v2_outfit_manage:${continuity.id}`,

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
                            `page:character:category:character:${characterId}`,

                        label:
                            "Retour",

                        emoji:
                            "⬅️"

                    }),

                    UI.components.navigation.close()
                );

        return interaction.update(

            UI.page.create({

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

            })

        );

    }

}

module.exports =
    new CharacterOutfitPage();
