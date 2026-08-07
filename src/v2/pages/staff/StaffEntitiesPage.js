const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType
} = require("discord.js");
const manager = require("../../managers/NarrativeEntityV2Manager");
const triggerCatalog = require("../../core/catalogs/NarrativeEntityTriggerCatalog");
const policy = require("../../core/policies/StaffPermissionPolicy");
const { navigationRow } = require("./StaffCharactersPage");

class StaffEntitiesPage {
    build(interaction) {
        const entities = manager.getByGuild(interaction.guildId);
        const writable = policy.canAccess(interaction, "entities", { write: true });
        const lines = entities.map(entity => [
            entity.is_enabled ? "✅" : "⏸️",
            `**${entity.name}**`,
            `· ${entity.triggers.length} déclencheur(s)`,
            `· ${entity.messages.length} message(s)`,
            `· ${entity.scopes.length ? `${entity.scopes.length} lieu(x)` : "tout le serveur"}`
        ].join(" "));
        const components = [];

        if (entities.length) {
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("v2_staff_entities_select")
                    .setPlaceholder("Ouvrir une Entité")
                    .addOptions(entities.slice(0, 25).map(entity => ({
                        label: entity.name.slice(0, 100),
                        description: `${entity.triggers.length} déclencheur(s) · ${entity.messages.length} message(s)`.slice(0, 100),
                        value: entity.id,
                        emoji: entity.is_enabled ? "✨" : "⏸️"
                    })))
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_staff_entities_create")
                .setLabel("Nouvelle Entité")
                .setEmoji("➕")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!writable)
        ));
        components.push(navigationRow());

        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("✨ Entités narratives")
                .setDescription([
                    "Les Entités donnent une identité immersive aux interventions automatiques de GreyCore.",
                    "GreyCore choisira une Entité active associée à l’événement, puis l’un de ses messages.",
                    "",
                    `**${entities.length} Entité(s) configurée(s)**`,
                    ...(
                        lines.length
                            ? lines
                            : ["Aucune Entité : les automatisations conservent leur présentation habituelle."]
                    ),
                    "",
                    writable ? "Vous pouvez créer et gérer les Entités de ce serveur." : "👁️ Accès en lecture seule."
                ].join("\n"))],
            components
        };
    }

    buildDetail(interaction, entityId, { confirmDelete = false } = {}) {
        const entity = manager.getById(interaction.guildId, entityId);
        if (!entity) return this.build(interaction);
        const writable = policy.canAccess(interaction, "entities", { write: true });
        const triggerLabels = entity.triggers.map(key => {
            const trigger = triggerCatalog.get(key);
            return trigger ? `${trigger.emoji} ${trigger.label}` : key;
        });
        const triggerSelect = new StringSelectMenuBuilder()
            .setCustomId(`v2_staff_entities_triggers:${entity.id}`)
            .setPlaceholder("Choisir les déclencheurs")
            .setMinValues(0)
            .setMaxValues(triggerCatalog.all().length)
            .setDisabled(!writable)
            .addOptions(triggerCatalog.all().map(trigger => ({
                label: trigger.label,
                value: trigger.key,
                emoji: trigger.emoji,
                default: entity.triggers.includes(trigger.key)
            })));
        const scopeSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`v2_staff_entities_scopes:${entity.id}`)
            .setPlaceholder("Salons et forums où l’Entité peut intervenir")
            .setChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum
            )
            .setMinValues(0)
            .setMaxValues(25)
            .setDefaultChannels(...entity.scopes.slice(0, 25))
            .setDisabled(!writable);

        const actionButtons = confirmDelete
            ? [
                new ButtonBuilder().setCustomId(`v2_staff_entities_delete_confirm:${entity.id}`)
                    .setLabel("Confirmer la suppression").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`v2_staff_entities_open:${entity.id}`)
                    .setLabel("Annuler").setStyle(ButtonStyle.Secondary)
            ]
            : [
                new ButtonBuilder().setCustomId(`v2_staff_entities_edit:${entity.id}`)
                    .setLabel("Modifier").setEmoji("✏️").setStyle(ButtonStyle.Primary).setDisabled(!writable),
                new ButtonBuilder().setCustomId(`v2_staff_entities_toggle:${entity.id}`)
                    .setLabel(entity.is_enabled ? "Désactiver" : "Activer")
                    .setEmoji(entity.is_enabled ? "⏸️" : "▶️").setStyle(ButtonStyle.Secondary).setDisabled(!writable),
                new ButtonBuilder().setCustomId(`v2_staff_entities_expressions:${entity.id}`)
                    .setLabel("Mots d’appel").setEmoji("💬").setStyle(ButtonStyle.Secondary).setDisabled(!writable),
                new ButtonBuilder().setCustomId(`v2_staff_entities_delete:${entity.id}`)
                    .setLabel("Supprimer").setEmoji("🗑️").setStyle(ButtonStyle.Danger).setDisabled(!writable)
            ];

        return {
            embeds: [new EmbedBuilder()
                .setColor(entity.embed_color)
                .setTitle(`${entity.is_enabled ? "✨" : "⏸️"} ${entity.name}`)
                .setThumbnail(entity.avatar_url || null)
                .setDescription([
                    entity.description || "Aucune description.",
                    "",
                    `**Statut :** ${entity.is_enabled ? "Active" : "Désactivée"}`,
                    `**Déclencheurs :** ${triggerLabels.join(", ") || "Aucun"}`,
                    `**Lieux :** ${entity.scopes.length ? entity.scopes.map(channelId => `<#${channelId}>`).join(", ") : "Tous les salons et forums compatibles du serveur"}`,
                    `**Appels :** le nom **${entity.name}**${entity.expressions.length ? `, ${entity.expressions.map(item => `\`${item.expression}\``).join(", ")}` : ""}`,
                    `**Messages :** ${entity.messages.length}`,
                    "",
                    ...entity.messages.slice(0, 5).map((message, index) => `${index + 1}. ${message.content}`),
                    ...(confirmDelete ? ["", "⚠️ Cette suppression retirera aussi ses messages et ses déclencheurs."] : [])
                ].join("\n"))],
            components: [
                new ActionRowBuilder().addComponents(triggerSelect),
                new ActionRowBuilder().addComponents(scopeSelect),
                new ActionRowBuilder().addComponents(...actionButtons),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("page:staff:section:entities")
                        .setLabel("Entités").setEmoji("⬅️").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("page:staff:home:root")
                        .setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("staff_close")
                        .setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
                )
            ]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffEntitiesPage();
