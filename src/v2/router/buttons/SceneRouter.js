const handler = require("../../interactions/scenes/SceneInteractionHandler");
const scopes = require("../../services/scenes/SceneContextInteractionService");

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
    if (interaction.customId === "v2_scene_move_cancel") {
        await interaction.update({
            content: "✅ Proposition de rattrapage annulée.",
            embeds: [],
            components: []
        });
        return true;
    }
    if (interaction.customId === "v2_scene_move_new") {
        await handler.openNewMove(interaction);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_move:")) {
        const { sceneId, contextId } = scopes.parseScene(interaction.customId);
        await handler.openMove(interaction, sceneId, contextId);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_close_vote:")) {
        const { sceneId, contextId } = scopes.parseScene(interaction.customId);
        await handler.voteClose(interaction, sceneId, contextId);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_close_now:")) {
        const { sceneId, contextId } = scopes.parseScene(interaction.customId);
        await handler.closeNow(interaction, sceneId, contextId);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_keep_open:")) {
        const { sceneId, contextId } = scopes.parseScene(interaction.customId);
        await handler.keepOpen(interaction, sceneId, false, contextId);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_close_cancel:")) {
        const { sceneId, contextId } = scopes.parseScene(interaction.customId);
        await handler.keepOpen(interaction, sceneId, true, contextId);
        return true;
    }
    return false;
};
