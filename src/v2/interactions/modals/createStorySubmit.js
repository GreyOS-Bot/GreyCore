const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "createStorySubmit"
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
                "Le déploiement doit être effectué depuis un serveur."
            );
        }

        const sourceContinuityId =
            interaction.customId
                .split(":")[1];

        const name =
            interaction.fields
                .getTextInputValue(
                    "story_name"
                )
                .trim();

        const result =
            deploymentService
                .deployReset({
                    sourceContinuityId,
                    continuityName:
                        name,
                    discordUserId:
                        interaction.user.id,
                    guildId:
                        interaction.guild.id,
                    guildName:
                        interaction.guild.name
                });

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

        return interaction.update(
            installationCreatedView.build(
                result.character,
                result.continuity,
                result.installation,
                interaction.guild,
                {
                    created:
                        true,
                    mode:
                        result.mode
                }
            )
        );
    } catch (error) {
        logger.error(
            "❌ Erreur création histoire V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Une erreur est survenue pendant la création de l’histoire."
        );
    }
};
