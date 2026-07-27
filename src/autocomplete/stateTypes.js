const stateManager =
    require("../managers/StateManager");

module.exports = async (interaction) => {
    const focusedValue =
        interaction.options
            .getFocused()
            .toLowerCase();

    const states =
        stateManager.getStateTypesByGuild(
            interaction.guild.id
        );

    const results = states
        .filter(state =>
            state.name
                .toLowerCase()
                .includes(focusedValue)
        )
        .slice(0, 25)
        .map(state => ({
            name:
                `${state.emoji || "❤️‍🩹"} ${state.name}`,
            value:
                String(state.id)
        }));

    return interaction.respond(results);
};