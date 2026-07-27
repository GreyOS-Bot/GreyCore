const contextService =
    require(
        "../../services/validation/RejectedProfileContextService"
    );

const rejectedProfileView =
    require(
        "../../views/validation/RejectedProfileView"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "openRejectedProfileEdit"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    try {
        const installationId =
            interaction.customId
                .split(":")[1];

        const context =
            contextService
                .resolve(
                    interaction,
                    installationId
                );

        if (context.error) {
            return replyError(
                interaction,
                context.error
            );
        }

        return interaction.showModal(
            rejectedProfileView
                .modal(
                    context
                )
        );
    } catch (error) {
        logger.error(
            "Erreur d’ouverture de la correction après refus.",
            error
        );

        return replyError(
            interaction,
            error
        );
    }
};
