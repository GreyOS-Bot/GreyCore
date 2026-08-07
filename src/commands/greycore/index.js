const { SlashCommandBuilder } = require("discord.js");
const v2 = require("../../v2");
const homeView = require("../../v2/views/home/LibraryHomeView");
const { replyPrivate } = require("../../v2/core/services/InteractionResponseService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("greycore")
        .setDescription("Ouvre ton espace personnel GreyCore."),

    async execute(interaction) {
        const user = v2.managers.user.getOrCreate(interaction.user.id);
        return replyPrivate(interaction, homeView.build(
            interaction.user,
            v2.managers.library.getStatistics(user.id),
            v2.managers.library.getCharacters(user.id)
        ));
    }
};
