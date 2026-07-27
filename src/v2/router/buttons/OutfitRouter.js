const {
    handleOutfitButtons
} = require(
    "../../interactions/outfits"
);

const openStoryOutfit =
    require(
        "../../interactions/buttons/openStoryOutfit"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "OutfitRouter"
    );

const staffErrorLogService =
    require(
        "../../services/StaffErrorLogService"
    );

module.exports =
    async function outfitRouter(
        interaction,
        dependencies = {}
    ) {
        if (!interaction.isButton()) {
            return false;
        }

        if (
            interaction.customId.startsWith(
                "v2_story_outfit:"
            )
        ) {
            await openStoryOutfit(
                interaction
            );

            return true;
        }

        if (
            !interaction.customId.startsWith(
                "v2_outfit_"
            )
        ) {
            return false;
        }

        try {
            return await handleOutfitButtons(
                interaction,
                dependencies
            );
        } catch (error) {
            await staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    "Module Tenues",
                error,
                interaction
            });

            logger.error(
                "❌ Erreur OutfitRouter :",
                error
            );

            await replyError(
                interaction,
                "Une erreur est survenue dans le module Outfit."
            );

            return true;
        }
    };
