const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const changeRequestManager =
    require(
        "../../managers/CharacterChangeRequestV2Manager"
    );

const validationStaffPolicy =
    require(
        "../../core/policies/ValidationStaffPolicy"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    const requestId =
        interaction.customId
            .split(":")[1];

    const request =
        changeRequestManager.getContext(
            requestId
        );

    if (!request) {
        return replyError(
            interaction,
            "Demande de modification introuvable."
        );
    }

    if (
        !validationStaffPolicy.canReview(
            interaction
        )
        || String(request.guild_id) !==
            String(interaction.guildId)
    ) {
        return replyError(
            interaction,
            "Seul le staff de ce serveur peut refuser cette modification."
        );
    }

    return interaction.showModal(
        new ModalBuilder()
            .setCustomId(
                `v2_change_request_reject_modal:${request.id}`
            )
            .setTitle(
                "Refuser la modification"
            )
            .addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId(
                                "change_request_rejection_reason"
                            )
                            .setLabel(
                                "Motif du refus"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
                            .setMaxLength(1000)
                    )
            )
    );
};
