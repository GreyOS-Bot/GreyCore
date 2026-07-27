const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Vérifie que Greycore fonctionne."),

    async execute(interaction) {
        await interaction.reply("🏓 Pong !");
    }
};