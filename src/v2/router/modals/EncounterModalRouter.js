const encounterHandler =
    require(
        "../../interactions/encounters/EncounterV2Handler"
    );

module.exports =
    async function encounterModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_enc_int:"
            )
        ) {
            const [
                ,
                continuityAId,
                continuityBId
            ] = customId.split(":");

            await encounterHandler
                .createInternal(
                    interaction,
                    continuityAId,
                    continuityBId
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_enc_ext:"
            )
        ) {
            await encounterHandler
                .createExternal(
                    interaction,
                    customId.split(":")[1]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_encounter_edit_submit:"
            )
        ) {
            const [
                ,
                characterId,
                encounterId
            ] = customId.split(":");

            await encounterHandler.edit(
                interaction,
                characterId,
                encounterId
            );

            return true;
        }

        return false;
    };
