const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const relationshipManager =
    require(
        "../../managers/RelationshipV2Manager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterRelationshipsPage {

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

                embeds: [],
                components: []

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

        const continuityId =
            continuity?.continuity_id
            || continuity?.id
            || null;

        const relationships =
            continuityId
                ? relationshipManager.getDisplayRelationships(
                    continuityId
                )
                : [];

        const relationshipsText =
            relationships.length > 0
                ? relationships
                    .map(relationship => {

                        const title =
                            `❤️ **${relationship.displayLabel}** — ${relationship.otherCharacterName}`;

                        return relationship.note
                            ? `${title}\n> ${relationship.note}`
                            : title;

                    })
                    .join("\n\n")
                : "Aucune relation enregistrée.";

        const embed =
            UI.embed.create({

                title:
                    null,

                thumbnail:
                    character.avatar_url
                    || null,

                description:
                    UI.components
                        .characterHeader
                        .build(character)

            });

        embed.addFields({

            name:
                "❤️ Relations",

            value:
                relationshipsText

        });

        const actionButtons = [];

        if (isOwner) {
            actionButtons.push(

                    UI.button.primary({

                        id:
                            `v2_relationship_add:${characterId}`,

                        label:
                            "Ajouter",

                        emoji:
                            "➕"

                    }),

                    UI.button.secondary({

                        id:
                            `v2_relationship_manage:${characterId}`,

                        label:
                            "Gérer",

                        emoji:
                            "⚙️"

                    })

            );
        }

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `page:character:category:social:${characterId}`,

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
                    actionButtons.length > 0
                        ? [
                            new ActionRowBuilder()
                                .addComponents(
                                    ...actionButtons
                                ),
                            navigationRow
                        ]
                        : [
                            navigationRow
                        ]

            })

        );

    }

}

module.exports =
    new CharacterRelationshipsPage();
