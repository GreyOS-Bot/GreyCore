const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "openContinueDeployment"
    );

const v2 =
    require("../../index");

const deploymentSummaryView =
    require(
        "../../views/deployment/DeploymentSummaryView"
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

        const continuityId =
            interaction.customId
                .split(":")[1];

        const user =
            v2.managers.user.getOrCreate(
                interaction.user.id
            );

        const continuity =
            v2.managers.continuity.getById(
                continuityId
            );

        if (!continuity) {
            return replyError(
                interaction,
                "Histoire introuvable."
            );
        }

        const character =
            v2.managers.library
                .getCharacterForUser(
                    continuity.character_id,
                    user.id
                );

        if (!character) {
            return replyError(
                interaction,
                "Tu ne peux pas déployer ce personnage."
            );
        }

        return interaction.update(
            deploymentSummaryView.build(
                character,
                continuity,
                interaction.guild
            )
        );
    } catch (error) {
        logger.error(
            "❌ Erreur préparation déploiement V2 :",
            error
        );

        return replyError(
            interaction,
            "Impossible de préparer le déploiement."
        );
    }
};
