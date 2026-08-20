const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const statsRepository = require("../../repositories/StaffDomainStatsRepository");
const moduleManager = require("../../managers/GuildModuleV2Manager");
const assetTypeManager = require("../../managers/AssetTypeV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffBankPage {
    build(interaction) {
        const stats = statsRepository.getBankStats(interaction.guildId);
        const enabled = moduleManager.isEnabled(interaction.guildId, "assets");
        const types = assetTypeManager.getForGuild(interaction.guildId);
        return {
            embeds: [new EmbedBuilder()
                .setColor(enabled ? 0xFEE75C : 0x99AAB5)
                .setTitle("🏦 Administration de la banque")
                .setDescription(`Module Biens : **${enabled ? "activé ✅" : "désactivé ❌"}**`)
                .addFields(
                    { name: "Biens enregistrés", value: String(stats.assets), inline: true },
                    { name: "Transferts", value: String(stats.transfers), inline: true },
                    { name: "Types de biens", value: String(stats.types), inline: true },
                    { name: "Catégories disponibles", value: types.map(type => `${type.emoji || "🎒"} ${type.label}`).join(" · ") || "Aucune catégorie configurée." }
                )],
            components: [actionRow(enabled, stats.types === 0), helpRow(), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

function actionRow(enabled, needsDefaults) {
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("v2_staff_domain_toggle:assets")
        .setLabel(enabled ? "Désactiver les biens" : "Activer les biens")
        .setEmoji(enabled ? "⏸️" : "▶️")
        .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success));
    if (needsDefaults) row.addComponents(new ButtonBuilder()
        .setCustomId("v2_staff_bank_install_defaults")
        .setLabel("Installer les catégories")
        .setEmoji("📦")
        .setStyle(ButtonStyle.Primary));
    return row;
}

function helpRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("v2_help:staff_bank")
            .setLabel("Aide")
            .setEmoji("❓")
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = new StaffBankPage();
