const {
    replyError
} = require(
    "../core/services/InteractionResponseService"
);

const logger =
    require(
        "../core/services/TechnicalLogger"
    ).create(
        "commandRouter"
    );

const staffErrorLogService =
    require(
        "../services/StaffErrorLogService"
    );

module.exports =
    async function commandRouter(
        interaction
    ) {

        if (
            !interaction.isChatInputCommand()
            &&
            !interaction.isMessageContextMenuCommand()
        ) {
            return false;
        }

        const command =
            interaction.client.commands.get(
                interaction.commandName
            );

        if (!command) {
            return true;
        }

        try {

            await command.execute(
                interaction
            );

        } catch (error) {

            logger.error(error);

            await staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    `Commande /${interaction.commandName}`,
                error,
                interaction
            });

            await replyError(
                interaction,
                "Une erreur est survenue."
            );

        }

        return true;

    };
