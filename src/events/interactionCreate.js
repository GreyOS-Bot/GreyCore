const {
    interactionRouter
} = require("../v2/router");

const staffErrorLogService =
    require("../v2/services/StaffErrorLogService");

const logger =
    require("../v2/core/services/TechnicalLogger")
        .create("InteractionCreate");

const {
    replyError
} = require(
    "../v2/core/services/InteractionResponseService"
);

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        try {
            await interactionRouter(
                interaction
            );
        } catch (error) {
            logger.error(
                "Erreur d’interaction non gérée :",
                error
            );

            await staffErrorLogService.report({
                guildId: interaction.guildId,
                scope: "Interaction Discord",
                error,
                interaction
            });

            if (
                typeof interaction.isAutocomplete !==
                    "function"
                || !interaction.isAutocomplete()
            ) {
                await replyError(
                    interaction,
                    "Une erreur inattendue est survenue. Le staff a été prévenu."
                ).catch(
                    replyFailure =>
                        logger.warn(
                            "Impossible de répondre à l’utilisateur :",
                            replyFailure
                        )
                );
            }
        }
    }
};
