const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");
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
                    .setCustomId("v2_staff_relationships_manage_types:0")
                    .setLabel("Gérer les types")
                    .setEmoji("🛠️")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("v2_staff_domain_toggle:relationships")
                    .setLabel(enabled ? "Désactiver les relations" : "Activer les relations")
                    .setEmoji(enabled ? "⏸️" : "▶️")
                    .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }

    buildTypeManagement(interaction, requestedPage = 0) {
        const types = typeRepository.getByGuild(interaction.guildId);
        const pageSize = 20;
        const pageCount = Math.max(1, Math.ceil(types.length / pageSize));
        const page = Math.max(0, Math.min(Number(requestedPage) || 0, pageCount - 1));
        const displayed = types.slice(page * pageSize, (page + 1) * pageSize);
        const components = [];
        if (displayed.length) {
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`v2_staff_relationships_delete_type:${page}`)
                    .setPlaceholder("Supprimer un type inutilisé")
                    .addOptions(displayed.map(type => ({
                        label: type.label_a_to_b.slice(0, 100),
                        description: type.is_symmetric
                            ? "Relation symétrique"
                            : `Inverse : ${type.label_b_to_a}`.slice(0, 100),
                        value: String(type.id)
                    })))
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v2_staff_relationships_manage_types:${page - 1}`)
                .setLabel("Précédent").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId(`v2_staff_relationships_manage_types:${page + 1}`)
                .setLabel("Suivant").setStyle(ButtonStyle.Secondary).setDisabled(page >= pageCount - 1),
            new ButtonBuilder().setCustomId("page:staff:relationships:root")
                .setLabel("Retour aux relations").setStyle(ButtonStyle.Secondary)
        ));
        return {
            embeds: [new EmbedBuilder()
                .setColor(0xEB459E)
                .setTitle("🛠️ Types de relations")
                .setDescription(displayed.map(type =>
                    `• **${type.label_a_to_b}**${type.is_symmetric ? " ↔" : ` → ${type.label_b_to_a}`}`
                ).join("\n") || "Aucun type configuré.")
                .setFooter({ text: `Page ${page + 1}/${pageCount} · ${types.length} type(s)` })],
            components
        };
    }
}

module.exports = new StaffRelationshipsPage();
