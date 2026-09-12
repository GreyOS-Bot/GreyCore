const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const stateManager =
    require("../../managers/StateV2Manager");

const {
    getInstallationId,
    getManageableDashboard
} =
    require(
        "../../interactions/states/StateAccessService"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

class ConfirmDeleteState {

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
                "Tu ne peux pas supprimer les états de ce personnage.",
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

        const state =
            stateManager
                .getActiveStates(
                    installationId
                )
                .find(currentState =>
                    String(
                        currentState.state_id
                        || currentState.id
                    ) === String(stateId)
                );

        if (!state) {
            return replyError(
                interaction,
                "Cet état est introuvable."
            );
        }

        const embed =
            UI.embed.create({

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
                "⚠️ Supprimer cet état ?",

            value:
                `${state.emoji || "❤️‍🩹"} **${state.name}**\n\n`
                + "Cette action est irréversible."

        });

        const confirmationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.danger({

                        id:
                            `v2_state_delete_confirm:${characterId}:${stateId}:${installationId}`,

                        label:
                            "Supprimer",

                        emoji:
                            "🗑️"

                    }),

                    UI.button.secondary({

                        id:
                            `v2_state_manage_open:${characterId}:${stateId}:${installationId}`,

                        label:
                            "Annuler",

                        emoji:
                            "❌"

                    })

                );

        return interaction.update(

            UI.page.create({

                embed,

                components: [
                    confirmationRow
                ]

            })

        );

    }

}

module.exports =
    new ConfirmDeleteState();
