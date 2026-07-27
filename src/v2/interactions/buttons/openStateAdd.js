const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const stateManager =
    require(
        "../../managers/StateTypeV2Manager"
    );

const {
    getManageableDashboard
} = require(
    "../states/StateAccessService"
);

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function openStateAdd(
        interaction
    ) {
        const characterId =
            interaction.customId
                .split(":")[1];

        const dashboardData =
            await getManageableDashboard(
                interaction,
                characterId,
                "Vous ne pouvez pas ajouter un état à ce personnage."
            );

        if (!dashboardData) {
            return;
        }

        const stateTypes =
            stateManager
                .getStateTypesByGuild(
                    interaction.guildId
                );

        if (!stateTypes.length) {
            return replyError(
                interaction,
                "Aucun type d’état n’est configuré sur ce serveur."
            );
        }

        const options =
            stateTypes
                .slice(0, 25)
                .map(
                    stateType => ({
                        label:
                            stateType.name
                                .slice(
                                    0,
                                    100
                                ),
                        value:
                            String(
                                stateType.id
                            ),
                        emoji:
                            stateType.emoji
                            || undefined
                    })
                );

        const selectMenu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    `v2_state_type_select:${characterId}`
                )
                .setPlaceholder(
                    "Choisir un type d’état"
                )
                .addOptions(
                    options
                );

        return replyPrivate(
            interaction,
            {
                content:
                    "❤️‍🩹 **Choisissez l’état à ajouter :**",
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            selectMenu
                        )
                ]
            }
        );
    };
