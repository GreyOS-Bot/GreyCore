const encounterV2Handler =
    require(
        "../../interactions/encounters/EncounterV2Handler"
    );

module.exports =
    async function encounterRouter(
        interaction
    ) {
        if (!interaction.isButton()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_encounter_delete_confirm:"
            )
        ) {
            const [
                ,
                characterId,
                encounterId
            ] = customId.split(":");

            await encounterV2Handler.delete(
                interaction,
                characterId,
                encounterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_encounter_manage:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            await encounterV2Handler.openManage(
                interaction,
                characterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_encounter_details:"
            )
        ) {
            const [
                ,
                characterId,
                encounterId
            ] = customId.split(":");

            await encounterV2Handler.openDetails(
                interaction,
                characterId,
                encounterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_encounter_edit:"
            )
        ) {
            const [
                ,
                characterId,
                encounterId
            ] = customId.split(":");

            await encounterV2Handler.openEdit(
                interaction,
                characterId,
                encounterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_encounter_delete:"
            )
        ) {
            const [
                ,
                characterId,
                encounterId
            ] = customId.split(":");

            await encounterV2Handler.confirmDelete(
                interaction,
                characterId,
                encounterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_encounter_add:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            await encounterV2Handler.openAdd(
                interaction,
                characterId
            );

            return true;
        }

        return false;
    };
