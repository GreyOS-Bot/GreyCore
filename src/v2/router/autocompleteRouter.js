const logger =
    require(
        "../core/services/TechnicalLogger"
    ).create(
        "autocompleteRouter"
    );

const staffErrorLogService =
    require(
        "../services/StaffErrorLogService"
    );

module.exports =
    async function autocompleteRouter(
        interaction
    ) {
        if (!interaction.isAutocomplete()) {
            return false;
        }

        const command =
            interaction.client.commands.get(
                interaction.commandName
            );

        if (
            !command
            ||
            typeof command.autocomplete
                !== "function"
        ) {
            await respondWithNoChoices(
                interaction
            );

            return true;
        }

        try {
            await command.autocomplete(
                interaction
            );
        } catch (error) {
            await staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    `Autocomplétion /${interaction.commandName}`,
                error,
                interaction
            });

            logger.error(
                `❌ Erreur autocomplétion /${interaction.commandName} :`,
                error
            );

            await respondWithNoChoices(
                interaction
            );
        }

        return true;
    };

async function respondWithNoChoices(
    interaction
) {
    if (interaction.responded) {
        return;
    }

    await interaction
        .respond([])
        .catch(
            () => null
        );
}
