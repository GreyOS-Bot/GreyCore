const handler = require("../../interactions/scenes/SceneInteractionHandler");

module.exports = async interaction => {
    if (interaction.isStringSelectMenu?.() && interaction.customId === "v2_scene_resume_select") {
        await handler.selectResume(interaction);
        return true;
    }
    if (interaction.isChannelSelectMenu?.() && interaction.customId.startsWith("v2_scene_move_channel:")) {
        await handler.selectMoveChannel(interaction, interaction.customId.split(":")[1]);
        return true;
    }
    return false;
};
