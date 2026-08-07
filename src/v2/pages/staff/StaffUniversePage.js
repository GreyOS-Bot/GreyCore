const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const stateTypeManager = require("../../managers/StateTypeV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffUniversePage {
    build(interaction) {
        const types = stateTypeManager.getStateTypesByGuild(interaction.guildId);
        const lines = types.slice(0, 20).map(type => {
            const count = stateTypeManager.countStatesUsingType(interaction.guildId, type.id);
            return `${type.emoji || "📌"} **${type.name || type.label}** · ${count} utilisation(s)`;
        });
        return {
            embeds: [new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle("🌍 Administration de l’univers")
                .setDescription([
                    "Référentiels propres à ce serveur.",
                    "",
                    `**Types d’états : ${types.length}**`,
                    lines.join("\n") || "Aucun type d’état n’est encore installé.",
                    "",
                    "Les organisations restent renseignées librement sur chaque personnage."
                ].join("\n"))],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_universe_install_states")
                    .setLabel("Installer les états par défaut")
                    .setEmoji("📦")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(types.length > 0)
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffUniversePage();
