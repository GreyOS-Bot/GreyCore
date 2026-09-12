const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "openStoryOutfit"
    );

const v2 =
    require("../../index");

const outfitV2View =
    require(
        "../../views/outfit/OutfitV2View"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);
const installationManager = require("../../managers/InstallationV2Manager");

module.exports = async interaction => {
    try {
        const continuityId =
            interaction.customId
                .split(":")[1];

        const continuity =
            v2.managers.continuity
                .getById(
                    continuityId
                );

        if (!continuity) {
            return replyError(
                interaction,
                "Cette histoire est introuvable."
            );
        }

        const user =
            v2.managers.user
                .getOrCreate(
                    interaction.user.id
                );

        const character =
            v2.managers.library
                .getCharacterForUser(
                    continuity.character_id,
                    user.id
                );

        if (!character) {
            return replyError(
                interaction,
                "Tu ne peux pas accéder à cette histoire."
            );
        }

        const outfit =
            (() => {
                const installation = installationManager.getByContinuityAndGuild(continuity.id, interaction.guildId);
                return installation ? v2.managers.outfit.getCurrent(installation.id) : null;
            })();

        const view =
            outfitV2View.build(
                character,
                continuity,
                outfit,
                {
                    canManage: true
                }
            );

        return interaction.update(
            view
        );
    } catch (error) {
        logger.error(
            "❌ Erreur ouverture Outfit V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible d’ouvrir Outfit."
        );
    }
};
