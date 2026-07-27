const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "confirmDeployment"
    );

const installationCreatedView =
    require(
        "../../views/deployment/InstallationCreatedView"
    );

const deploymentService =
    require(
        "../../services/deployment/DeploymentV2Service"
    );

const staffTrackingService =
    require(
        "../../services/validation/InstallationStaffTrackingService"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    try {
        if (!interaction.guild) {
            return replyError(
                interaction,
                "Cette action doit être effectuée depuis un serveur."
            );
        }

        const sourceContinuityId =
            interaction.customId
                .split(":")[1];

        const result =
            deploymentService
                .deployExisting({
                    sourceContinuityId,
                    discordUserId:
                        interaction.user.id,
                    guildId:
                        interaction.guild.id,
                    guildName:
                        interaction.guild.name
                });

        if (result.created) {
            await staffTrackingService
                .sync({
                    client:
                        interaction.client,
                    guild:
                        interaction.guild,
                    installationId:
                        result.installation.id,
                    requesterId:
                        interaction.user.id
                });
        }

        return interaction.update(
            installationCreatedView.build(
                result.character,
                result.continuity,
                result.installation,
                interaction.guild,
                {
                    created:
                        result.created,
                    mode:
                        result.mode
                }
            )
        );
    } catch (error) {
        logger.error(
            "❌ Erreur création installation V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible de créer l’installation."
        );
    }
};
