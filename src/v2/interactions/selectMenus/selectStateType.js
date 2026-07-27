const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const {
    getGuildStateType,
    getManageableDashboard
} = require(
    "../states/StateAccessService"
);

module.exports =
    async function selectStateType(
        interaction
    ) {
        const characterId =
            interaction.customId
                .split(":")[1];

        const stateTypeId =
            Number(
                interaction.values[0]
            );

        const dashboardData =
            await getManageableDashboard(
                interaction,
                characterId,
                "Vous ne pouvez pas ajouter un état à ce personnage."
            );

        if (!dashboardData) {
            return;
        }

        const stateType =
            await getGuildStateType(
                interaction,
                stateTypeId
            );

        if (!stateType) {
            return;
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_state_create:${characterId}:${stateType.id}`
                )
                .setTitle(
                    `${stateType.emoji || "❤️‍🩹"} ${stateType.name}`
                        .slice(
                            0,
                            45
                        )
                );

        const note =
            new TextInputBuilder()
                .setCustomId(
                    "note"
                )
                .setLabel(
                    "Note (facultatif)"
                )
                .setStyle(
                    TextInputStyle
                        .Paragraph
                )
                .setRequired(
                    false
                )
                .setMaxLength(
                    1000
                );

        const startedAt =
            new TextInputBuilder()
                .setCustomId(
                    "started_at"
                )
                .setLabel(
                    "Date de début (facultatif)"
                )
                .setPlaceholder(
                    "Laisser vide pour aujourd’hui"
                )
                .setStyle(
                    TextInputStyle
                        .Short
                )
                .setRequired(
                    false
                )
                .setMaxLength(
                    100
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    note
                ),
            new ActionRowBuilder()
                .addComponents(
                    startedAt
                )
        );

        return interaction.showModal(
            modal
        );
    };
