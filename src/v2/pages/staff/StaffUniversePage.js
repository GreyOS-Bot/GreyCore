const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");
const stateTypeManager = require("../../managers/StateTypeV2Manager");
const decisionService = require("../../core/services/StaffPermissionDecisionService");
const staffPolicy = require("../../core/policies/StaffPermissionPolicy");
const { navigationRow } = require("./StaffCharactersPage");

class StaffUniversePage {
    build(interaction) {
        const canCreate = canWriteCharacters(interaction);
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
                    .setDisabled(types.length > 0 || !canCreate),
                new ButtonBuilder()
                    .setCustomId("v2_staff_universe_create_state")
                    .setLabel("Nouvel état")
                    .setEmoji("➕")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!canCreate),
                new ButtonBuilder()
                    .setCustomId("v2_staff_universe_manage_states:0")
                    .setLabel("Gérer les états")
                    .setEmoji("🛠️")
                    .setStyle(ButtonStyle.Secondary)
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }

    buildStateManagement(interaction, requestedPage = 0) {
        const canDelete = staffPolicy.canManagePermissions(interaction);
        const types = stateTypeManager.getStateTypesByGuild(interaction.guildId);
        const pageSize = 20;
        const pageCount = Math.max(1, Math.ceil(types.length / pageSize));
        const page = Math.max(0, Math.min(Number(requestedPage) || 0, pageCount - 1));
        const displayed = types.slice(page * pageSize, (page + 1) * pageSize);
        const components = [];
        if (displayed.length) {
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`v2_staff_universe_delete_state:${page}`)
                    .setPlaceholder("Supprimer un état inutilisé")
                    .setDisabled(!canDelete)
                    .addOptions(displayed.map(type => ({
                        label: type.name.slice(0, 100),
                        description: `${stateTypeManager.countStatesUsingType(interaction.guildId, type.id)} utilisation(s)`,
                        value: String(type.id),
                        emoji: type.emoji || "📌"
                    })))
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v2_staff_universe_manage_states:${page - 1}`)
                .setLabel("Précédent").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId(`v2_staff_universe_manage_states:${page + 1}`)
                .setLabel("Suivant").setStyle(ButtonStyle.Secondary).setDisabled(page >= pageCount - 1),
            new ButtonBuilder().setCustomId("page:staff:universe:root")
                .setLabel("Retour à l’univers").setStyle(ButtonStyle.Secondary)
        ));
        return {
            embeds: [new EmbedBuilder().setColor(0x3498DB)
                .setTitle("🛠️ Types d’états")
                .setDescription(displayed.map(type => {
                    const count = stateTypeManager.countStatesUsingType(interaction.guildId, type.id);
                    return `${type.emoji || "📌"} **${type.name}** · ${count} utilisation(s)`;
                }).join("\n") || "Aucun état configuré.")
                .setFooter({ text: `Page ${page + 1}/${pageCount} · ${types.length} état(s)` })],
            components
        };
    }
}

function canWriteCharacters(interaction) {
    return decisionService.decide({
        interaction,
        permission: "characters",
        write: true
    }).allowed;
}

module.exports = new StaffUniversePage();
