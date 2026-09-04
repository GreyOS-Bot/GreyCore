const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const statsRepository = require("../../repositories/StaffDomainStatsRepository");
const moduleManager = require("../../managers/GuildModuleV2Manager");
const assetTypeManager = require("../../managers/AssetTypeV2Manager");
const decisionService = require("../../core/services/StaffPermissionDecisionService");
const { navigationRow } = require("./StaffCharactersPage");

class StaffAssetsPage {
    build(interaction) {
        const { decisions } = decisionService.decideMany({
            interaction,
            requests: [
                { permission: "assets", write: false },
                { permission: "assets", write: true },
                { permission: "modules", write: true }
            ]
        });
        const [readDecision, writeDecision, moduleDecision] = decisions;
        if (!readDecision.allowed) return null;

        const stats = statsRepository.getBankStats(interaction.guildId);
        const enabled = moduleManager.isEnabled(interaction.guildId, "assets");
        const types = assetTypeManager.getForGuild(interaction.guildId);
        const actions = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_staff_domain_toggle:assets")
                .setLabel(enabled ? "Désactiver les biens" : "Activer les biens")
                .setEmoji(enabled ? "⏸️" : "▶️")
                .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setDisabled(!moduleDecision.allowed)
        );
        if (stats.types === 0) {
            actions.addComponents(new ButtonBuilder()
                .setCustomId("v2_staff_assets_install_defaults")
                .setLabel("Installer les types")
                .setEmoji("📦")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!writeDecision.allowed));
        }

        return {
            embeds: [new EmbedBuilder()
                .setColor(enabled ? 0xFEE75C : 0x99AAB5)
                .setTitle("🎒 Administration des Biens")
                .setDescription(`Module Biens : **${enabled ? "activé ✅" : "désactivé ❌"}**`)
                .addFields(
                    { name: "Biens enregistrés", value: String(stats.assets), inline: true },
                    { name: "Transferts", value: String(stats.transfers), inline: true },
                    { name: "Types de biens", value: String(stats.types), inline: true },
                    { name: "Types disponibles", value: types.map(type => `${type.emoji || "🎒"} ${type.label}`).join(" · ") || "Aucun type configuré." },
                    { name: "Droits", value: writeDecision.allowed ? "Gestion des biens autorisée." : "Consultation uniquement." }
                )],
            components: [actions, navigationRow()]
        };
    }

    execute(interaction) {
        const payload = this.build(interaction);
        if (!payload) {
            return interaction.update({
                content: "❌ Tu n'as pas accès à cette partie de l'administration.",
                embeds: [],
                components: []
            });
        }
        return interaction.update(payload);
    }
}

module.exports = new StaffAssetsPage();
