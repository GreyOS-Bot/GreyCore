const handler = require("../../interactions/scenes/SceneInteractionHandler");

module.exports = async interaction => {
    if (!interaction.isButton()) return false;
    if (!interaction.customId) return false;
    if (interaction.customId === "v2_scene_start") {
        await handler.start(interaction);
        return true;
    }
    if (interaction.customId === "v2_scene_resume") {
        await handler.resume(interaction);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_move:")) {
        await handler.openMove(interaction, interaction.customId.split(":")[1]);
        return true;
    }
    return false;
};
