const changeRequestManager =
    require(
        "../../managers/CharacterChangeRequestV2Manager"
    );

const validationPermissionAccess =
    require(
        "../../core/services/ValidationPermissionAccessService"
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
            !validationPermissionAccess.canWrite(
                interaction
            )
            || String(request.guild_id) !==
                String(interaction.guildId)
        ) {
            return replyError(
                interaction,
                "Seul le staff de ce serveur peut valider cette modification."
            );
        }

        await interaction.deferUpdate();

        changeRequestManager.approve({
            requestId,
            reviewedBy:
                interaction.user.id
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
                "approved"
        });
    } catch (error) {
        return replyError(
            interaction,
            error.message
            || "Impossible de valider cette modification."
        );
    }
};
