const changeRequestManager =
    require(
        "../../managers/CharacterChangeRequestV2Manager"
    );

const validationStaffPolicy =
    require(
        "../../core/policies/ValidationStaffPolicy"
    );

const cardBuilder =
    require(
        "../../builders/CharacterChangeRequestCardBuilder"
    );

const notificationService =
    require(
        "../../services/validation/ChangeRequestNotificationService"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    try {
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

        const reason =
            interaction.fields
                .getTextInputValue(
                    "change_request_rejection_reason"
                )
                .trim();

        await interaction.deferUpdate();

        changeRequestManager.reject({
            requestId,
            reviewedBy:
                interaction.user.id,
            reason
        });

        const updatedRequest =
            changeRequestManager.getContext(
                requestId
            );

        await interaction.editReply(
            cardBuilder.build(
                updatedRequest,
                interaction.guild?.name
            )
        );

        await notificationService.notify({
            client:
                interaction.client,
            requesterId:
                updatedRequest.submitted_by,
            characterName:
                updatedRequest.proxy_name,
            guildName:
                interaction.guild?.name,
            status:
                "rejected",
            reason:
                updatedRequest.rejection_reason
        });
    } catch (error) {
        return replyError(
            interaction,
            error.message
            || "Impossible de refuser cette modification."
        );
    }
};
