const {
    ActionRowBuilder,
    StringSelectMenuBuilder
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

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

class OpenStateManager {

    async execute(
        interaction,
        characterId,
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
            installationId
                ? stateManager.getActiveStates(
                    installationId
                )
                : [];

        if (states.length === 0) {
            return replyError(
                interaction,
                "Ce personnage ne possède aucun état actif à gérer."
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
                    UI.components
                        .characterHeader
                        .build(character)

            });

        embed.addFields({

            name:
                "⚙️ Gérer un état",

            value:
                "Sélectionne l’état que tu souhaites modifier ou supprimer."

        });

        const options =
            states
                .slice(0, 25)
                .map(state => ({

                    label:
                        String(state.name)
                            .slice(0, 100),

                    description:
                        state.note
                            ? String(state.note)
                                .replace(/\n/g, " ")
                                .slice(0, 100)
                            : "Aucune note",

                    value:
                        String(
                            state.state_id
                            || state.id
                        ),

                    emoji:
                        state.emoji
                        || "❤️‍🩹"

                }));

        const selectMenu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    `v2_state_manage_select:${characterId}:${installationId}`
                )
                .setPlaceholder(
                    "Choisir un état"
                )
                .addOptions(options);

        const selectRow =
            new ActionRowBuilder()
                .addComponents(
                    selectMenu
                );

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `page:character:states:${characterId}~${installationId}`,

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
                    selectRow,
                    navigationRow
                ]

            })

        );

    }

}

module.exports =
    new OpenStateManager();
