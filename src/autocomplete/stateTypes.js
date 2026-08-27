const stateManager =
    require("../managers/StateManager");

module.exports = async (interaction) => {
    const focusedValue =
        interaction.options
            .getFocused()
            .toLowerCase();

    const results =
        stateManager.searchStateTypes(
            interaction.guild.id,
            focusedValue,
            25
        )
        .map(state => ({
            name:
                `${state.emoji || "❤️‍🩹"} ${state.name}`,
            value:
                String(state.id)
        }));

    return interaction.respond(results);
};
