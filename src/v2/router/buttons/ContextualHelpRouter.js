const helpView = require("../../views/help/GettingStartedGuideView");

module.exports = async interaction => {
    if (!interaction.isButton?.()) return false;
    if (!interaction.customId?.startsWith("v2_help:")) return false;

    const topic = interaction.customId.replace("v2_help:", "");
    await interaction.update(helpView.build(topic));
    return true;
};
