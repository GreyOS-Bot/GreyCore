const { EmbedBuilder } = require("discord.js");
const { navigationRow } = require("./StaffCharactersPage");

class StaffBankPage {
    build(interaction) {
        return {
            embeds: [new EmbedBuilder()
                .setColor(0x99AAB5)
                .setTitle("🏦 Administration de la banque")
                .setDescription([
                    "Les fonctions financières seront disponibles dans un prochain sous-lot.",
                    "",
                    "La gestion des **Biens** dispose désormais de sa propre section."
                ].join("\n"))],
            components: [navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffBankPage();
