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
        await handler.openMove(interaction, interaction.customId.split(":")[1]);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_close_vote:")) {
        await handler.voteClose(interaction, interaction.customId.split(":")[1]);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_close_now:")) {
        await handler.closeNow(interaction, interaction.customId.split(":")[1]);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_keep_open:")) {
        await handler.keepOpen(interaction, interaction.customId.split(":")[1]);
        return true;
    }
    if (interaction.customId.startsWith("v2_scene_close_cancel:")) {
        await handler.keepOpen(interaction, interaction.customId.split(":")[1], true);
        return true;
    }
    return false;
};
