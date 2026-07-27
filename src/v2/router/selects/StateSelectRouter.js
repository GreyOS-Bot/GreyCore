const selectManagedState =
    require(
        "../../actions/states/selectManagedState"
    );

const selectStateType =
    require(
        "../../interactions/selectMenus/selectStateType"
    );

module.exports =
    async function stateSelectRouter(
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
                "v2_state_manage_select:"
            )
        ) {
            await selectManagedState.execute(
                interaction,
                customId.split(":")[1],
                interaction.values[0]
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_state_type_select:"
            )
        ) {
            await selectStateType(
                interaction
            );

            return true;
        }

        return false;
    };
