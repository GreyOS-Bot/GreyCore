const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "openContinuityInstallations"
    );

const v2 =
    require("../../index");

const installationListView =
    require(
        "../../views/installation/InstallationListView"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    try {
        const continuityId =
            interaction.customId
                .split(":")[1];

        if (!continuityId) {
            return replyError(
                interaction,
                "Identifiant de l’histoire invalide."
            );
        }

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
                "Cette histoire est introuvable."
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
                "Ce personnage est introuvable ou ne t’appartient pas."
            );
        }

        const installations =
            v2.managers.installation
                .getByContinuity(
                    continuity.id
                )
                .map(installation => {
                    const guild =
                        interaction.client.guilds.cache.get(
                            installation.guild_id
                        );

                    return {
                        ...installation,

                        guild_name:
                            guild?.name ||
                            "Serveur indisponible"
                    };
                });

        const view =
            installationListView.build(
                character,
                continuity,
                installations
            );

        return interaction.update(
            view
        );
    } catch (error) {
        logger.error(
            "❌ Erreur ouverture installations V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible d’ouvrir les installations."
        );
    }
};
