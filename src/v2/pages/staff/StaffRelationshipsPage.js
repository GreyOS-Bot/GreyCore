const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const statsRepository = require("../../repositories/StaffDomainStatsRepository");
const typeRepository = require("../../repositories/RelationshipTypeRepository");
const moduleManager = require("../../managers/GuildModuleV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffRelationshipsPage {
    build(interaction) {
        const stats = statsRepository.getRelationshipStats(interaction.guildId);
        const enabled = moduleManager.isEnabled(interaction.guildId, "relationships");
        const types = typeRepository.getByGuild(interaction.guildId);
        return {
            embeds: [new EmbedBuilder()
                .setColor(enabled ? 0xEB459E : 0x99AAB5)
                .setTitle("🎭 Administration des relations")
                .setDescription(`Module : **${enabled ? "activé ✅" : "désactivé ❌"}**`)
                .addFields(
                    { name: "Relations actives", value: String(stats.relationships), inline: true },
                    { name: "Demandes en attente", value: String(stats.pending), inline: true },
                    { name: "Types configurés", value: String(stats.types), inline: true },
                    { name: "Aperçu des types", value: types.slice(0, 20).map(type => `• ${type.label_a_to_b}`).join("\n") || "Aucun type configuré. Installe les types par défaut depuis les outils de relations." }
                )],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_relationships_create_type")
                    .setLabel("Nouveau type")
                    .setEmoji("➕")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("v2_staff_domain_toggle:relationships")
                    .setLabel(enabled ? "Désactiver les relations" : "Activer les relations")
                    .setEmoji(enabled ? "⏸️" : "▶️")
                    .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffRelationshipsPage();
