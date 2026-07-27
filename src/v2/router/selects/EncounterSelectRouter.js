const encounterHandler =
    require(
        "../../interactions/encounters/EncounterV2Handler"
    );

module.exports =
    async function encounterSelectRouter(
        interaction
    ) {
        if (
            !interaction
                .isStringSelectMenu()
        ) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_encounter_character:"
            )
        ) {
            await encounterHandler
                .selectCharacter(
                    interaction,
                    customId.split(":")[1],
                    interaction.values[0]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_encounter_manage_select:"
            )
        ) {
            await encounterHandler
                .openDetails(
                    interaction,
                    customId.split(":")[1],
                    interaction.values[0]
                );

            return true;
        }

        return false;
    };
