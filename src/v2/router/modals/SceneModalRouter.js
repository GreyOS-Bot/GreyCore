const handler = require("../../interactions/scenes/SceneInteractionHandler");

module.exports = async interaction => {
    if (!interaction.isModalSubmit()) return false;
    if (!interaction.customId) return false;
    if (interaction.customId === "v2_scene_start_submit") {
        await handler.submitStart(interaction);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_move_submit:")) {
        const [, sceneId, destinationId] = interaction.customId.split(":");
        await handler.submitMove(interaction, sceneId, destinationId);
        return true;
    }
    return false;
};
