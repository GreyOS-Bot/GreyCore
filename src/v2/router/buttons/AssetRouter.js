const {
    handleAssetButtons
} = require(
    "../../interactions/assets/AssetButtons"
);

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create("AssetRouter");

const staffErrorLogService =
    require(
        "../../services/StaffErrorLogService"
    );

module.exports =
    async function assetRouter(interaction) {
        if (
            !interaction.isButton()
            || !interaction.customId.startsWith("v2_asset_")
        ) {
            return false;
        }

        try {
            return await handleAssetButtons(interaction);
        } catch (error) {
            logger.error("Erreur module Biens.", error);

            await staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    "Module Biens",
                error,
                interaction
            });

            await replyError(interaction, error);

            return true;
        }
    };
