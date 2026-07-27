const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const stateManager =
    require("../../managers/StateV2Manager");

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterStatesPage {

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

        const continuityId =
            continuity?.continuity_id
            || continuity?.id
            || null;

        const states =
            continuityId
                ? stateManager.getActiveStates(
                    continuityId
                )
                : [];

        const statesText =
            states.length > 0
                ? states.map(state => {

                    const title =
                        `${state.emoji || "❤️‍🩹"} **${state.name}**`;

                    return state.note
                        ? `${title}\n> ${state.note}`
                        : title;

                }).join("\n\n")
                : "Aucun état actif.";

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
                "❤️‍🩹 États",

            value:
                statesText

        });

        const actionButtons = [];

        if (isOwner) {
            actionButtons.push(

            UI.button.primary({

                id:
                    `v2_state_add:${characterId}`,

                label:
                    "Ajouter",

                emoji:
                    "➕"

            }),

            UI.button.secondary({

                id:
                    `v2_state_manage:${characterId}`,

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
                            `page:character:category:character:${characterId}`,

                        label:
                            "Personnage",

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
    new CharacterStatesPage();
