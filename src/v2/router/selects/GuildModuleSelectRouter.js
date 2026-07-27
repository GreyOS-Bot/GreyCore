const handler =
    require(
        "../../interactions/settings/GuildModuleSettingsHandler"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create("GuildModuleSelectRouter");

const staffErrorLogService =
    require(
        "../../services/StaffErrorLogService"
    );

module.exports =
    async function guildModuleSelectRouter(interaction) {
        if (
            !interaction.isStringSelectMenu()
            || interaction.customId !== "v2_config_modules_toggle"
        ) {
            return false;
        }

        try {
            await handler.toggle(interaction);
        } catch (error) {
            logger.error("Configuration des modules impossible.", error);

            await staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    "Configuration des modules",
                error,
                interaction
            });
            await replyError(interaction, error);
        }

        return true;
    };
