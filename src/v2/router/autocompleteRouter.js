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

const fastAutocompleteResponseService =
    require(
        "../core/services/FastAutocompleteResponseService"
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
                createFastInteraction(
                    interaction
                )
            );
        } catch (error) {
            if (
                !fastAutocompleteResponseService
                    .hasAttempted(interaction)
            ) {
                await respondWithNoChoices(
                    interaction
                );
            }

            logger.error(
                `❌ Erreur autocomplétion /${interaction.commandName} :`,
                error
            );

            void staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    `Autocomplétion /${interaction.commandName}`,
                error,
                interaction
            }).catch(reportError => {
                logger.warn(
                    `Impossible de journaliser l’erreur d’autocomplétion /${interaction.commandName} :`,
                    reportError
                );
            });
        }

        return true;
    };

async function respondWithNoChoices(
    interaction
) {
    if (interaction.responded) {
        return;
    }

    await fastAutocompleteResponseService
        .respond(
            interaction,
            []
        )
        .catch(
            () => null
        );
}

function createFastInteraction(
    interaction
) {
    return new Proxy(
        interaction,
        {
            get(target, property) {
                if (property === "respond") {
                    return choices =>
                        fastAutocompleteResponseService
                            .respond(
                                target,
                                choices
                            );
                }

                const value = Reflect.get(
                    target,
                    property,
                    target
                );

                return typeof value === "function"
                    ? value.bind(target)
                    : value;
            }
        }
    );
}
