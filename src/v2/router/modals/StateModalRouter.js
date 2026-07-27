const editState =
    require(
        "../../actions/states/editState"
    );

const createState =
    require(
        "../../interactions/modals/createState"
    );

module.exports =
    async function stateModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_state_edit_submit:"
            )
        ) {
            const [
                ,
                characterId,
                stateId
            ] = customId.split(":");

            await editState.execute(
                interaction,
                characterId,
                stateId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_state_create:"
            )
        ) {
            await createState(
                interaction
            );

            return true;
        }

        return false;
    };
