const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const {
    getInstallationId,
    getManageableDashboard
} =
    require(
        "../../interactions/states/StateAccessService"
    );

const stateManager =
    require("../../managers/StateV2Manager");

class SelectManagedState {

    async execute(
        interaction,
        characterId,
        stateId,
        installationId
    ) {

        const dashboardData =
            await getManageableDashboard(
                interaction,
                characterId,
                "Tu ne peux pas gérer les états de ce personnage.",
                installationId
            );

        if (!dashboardData) {
            return;
        }

        const {
            character,
            continuity
        } = dashboardData;

        installationId = getInstallationId(dashboardData);

        const states =
            stateManager.getActiveStates(
                installationId
            );

        const state =
            states.find(s =>
                String(
                    s.state_id || s.id
                ) === String(stateId)
            );

        if (!state) {

            return interaction.update({

                content:
                    "❌ État introuvable.",

                embeds: [],
                components: []

            });

        }

        const embed =
            UI.embed.create({

                thumbnail:
                    character.avatar_url,

                description:
                    UI.components
                        .characterHeader
                        .build(character)

            });

        embed.addFields(

            {

                name:
                    `${state.emoji || "❤️‍🩹"} ${state.name}`,

                value:
                    state.note
                    || "*Aucune note.*"

            },

            {

                name:
                    "📅 Début",

                value:
                    state.started_at
                    || "Inconnue",

                inline:
                    true

            }

        );

        const actionRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.primary({

    id:
        `v2_state_edit:${characterId}:${stateId}:${installationId}`,

    label:
        "Modifier",

    emoji:
        "✏️"

}),

UI.button.danger({

    id:
    `v2_state_delete:${characterId}:${stateId}:${installationId}`,

    label:
        "Supprimer",

    emoji:
        "🗑️"

})

                );

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `v2_state_manage:${characterId}:${installationId}`,

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

                components: [
                    actionRow,
                    navigationRow
                ]

            })

        );

    }

}

module.exports =
    new SelectManagedState();
