module.exports = async interaction => {
    if (!interaction.isStringSelectMenu?.() || interaction.customId !== "v2_player_help_topic") return false;
    const guide = require("../../views/help/GettingStartedGuideView").build(interaction.values[0]);
    await interaction.update({
        ...guide,
        components: [require("../../views/player/PlayerHelpView").navigationRow()]
    });
    return true;
};
