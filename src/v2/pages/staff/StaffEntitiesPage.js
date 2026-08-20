const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType
} = require("discord.js");
const manager = require("../../managers/NarrativeEntityV2Manager");
const triggerCatalog = require("../../core/catalogs/NarrativeEntityTriggerCatalog");
const eventManager = require("../../managers/NarrativeEntityEventManager");
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
                ,
            new ButtonBuilder()
                .setCustomId("v2_staff_entities_broadcast")
                .setLabel("Diffusion manuelle")
                .setEmoji("📣")
                .setStyle(ButtonStyle.Success)
                .setDisabled(!writable || !entities.some(entity => entity.is_enabled))
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_help:staff_entities")
                .setLabel("Aide")
                .setEmoji("❓")
                .setStyle(ButtonStyle.Secondary)
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

    buildBroadcast(interaction, draft) {
        const entities = manager.getByGuild(interaction.guildId)
            .filter(entity => entity.is_enabled);
        const selectedEntities = entities.filter(entity => draft.entityIds.includes(entity.id));
        const entitySelect = new StringSelectMenuBuilder()
            .setCustomId("v2_staff_entities_broadcast_entities")
            .setPlaceholder("Choisir jusqu’à 5 Entités")
            .setMinValues(1)
            .setMaxValues(Math.min(5, entities.length))
            .addOptions(entities.slice(0, 25).map(entity => ({
                label: entity.name.slice(0, 100),
                value: entity.id,
                emoji: "✨",
                default: draft.entityIds.includes(entity.id)
            })));
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId("v2_staff_entities_broadcast_channels")
            .setPlaceholder("Choisir jusqu’à 10 salons ou forums")
            .setChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum
            )
            .setMinValues(1)
            .setMaxValues(10)
            .setDefaultChannels(...draft.channelIds.slice(0, 10));
        const sendCount = selectedEntities.length * draft.channelIds.length;

        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("📣 Diffusion manuelle des Entités")
                .setDescription([
                    "Envoyez le même message avec une ou plusieurs Entités dans plusieurs lieux simultanément.",
                    "Dans un forum, GreyCore créera une nouvelle publication.",
                    "",
                    `**Entités :** ${selectedEntities.map(entity => entity.name).join(", ") || "aucune"}`,
                    `**Destinations :** ${draft.channelIds.map(id => `<#${id}>`).join(", ") || "aucune"}`,
                    `**Envois prévus :** ${sendCount}`
                ].join("\n"))],
            components: [
                new ActionRowBuilder().addComponents(entitySelect),
                new ActionRowBuilder().addComponents(channelSelect),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("v2_staff_entities_broadcast_compose")
                        .setLabel("Rédiger et envoyer")
                        .setEmoji("✍️")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!selectedEntities.length || !draft.channelIds.length),
                    new ButtonBuilder()
                        .setCustomId("v2_staff_entities_broadcast_cancel")
                        .setLabel("Annuler")
                        .setStyle(ButtonStyle.Secondary)
                ),
                navigationRow()
            ]
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
                new ButtonBuilder().setCustomId(`v2_staff_entities_events:${entity.id}`)
                    .setLabel("Programmations").setEmoji("📅").setStyle(ButtonStyle.Secondary),
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
                    new ButtonBuilder().setCustomId("v2_help:staff_entities")
                        .setLabel("Aide").setEmoji("❓").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("page:staff:home:root")
                        .setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("staff_close")
                        .setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
                )
            ]
        };
    }

    buildEvents(interaction, entityId) {
        const entity = manager.getById(interaction.guildId, entityId);
        if (!entity) return this.build(interaction);
        const events = eventManager.getByEntity(interaction.guildId, entityId);
        const writable = policy.canAccess(interaction, "entities", { write: true });
        const components = [];
        if (events.length) components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`v2_staff_entities_event_select:${entity.id}`)
                .setPlaceholder("Ouvrir une programmation")
                .addOptions(events.slice(0, 25).map(event => ({
                    label: event.name.slice(0, 100), value: event.id,
                    description: `${event.calendar_rule} · ${event.time_rule}`.slice(0, 100),
                    emoji: event.is_enabled ? "⏰" : "⏸️"
                })))
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`v2_staff_entities_event_create:${entity.id}`)
                .setLabel("Programmer une apparition").setEmoji("➕")
                .setStyle(ButtonStyle.Primary).setDisabled(!writable),
            new ButtonBuilder().setCustomId(`v2_staff_entities_open:${entity.id}`)
                .setLabel("Entité").setEmoji("⬅️").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("v2_help:staff_entities")
                .setLabel("Aide").setEmoji("❓").setStyle(ButtonStyle.Secondary)
        ));
        return {
            embeds: [new EmbedBuilder().setColor(entity.embed_color)
                .setTitle(`📅 Programmations de ${entity.name}`)
                .setDescription([
                    "Planifiez des apparitions automatiques sans intervention du staff.",
                    "Les dates, jours et heures peuvent être combinés librement.", "",
                    ...(events.length ? events.map(event =>
                        `${event.is_enabled ? "✅" : "⏸️"} **${event.name}** · ${formatSchedule(event)} · ${event.scopes.length} lieu(x)`
                    ) : ["Aucune apparition programmée."])
                ].join("\n"))],
            components
        };
    }

    buildEventDetail(interaction, eventId) {
        const event = eventManager.getById(interaction.guildId, eventId);
        if (!event) return this.build(interaction);
        const writable = policy.canAccess(interaction, "entities", { write: true });
        const scopeSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`v2_staff_entities_event_scopes:${event.id}`)
            .setPlaceholder("Salons, catégories et forums d’apparition")
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildCategory)
            .setMinValues(1).setMaxValues(25)
            .setDefaultChannels(...event.scopes.slice(0, 25)).setDisabled(!writable);
        return {
            embeds: [new EmbedBuilder().setColor(event.embed_color)
                .setTitle(`${event.is_enabled ? "⏰" : "⏸️"} ${event.name}`)
                .setDescription([
                    `**Entité :** ${event.entity_name}`,
                    `**Calendrier :** ${formatSchedule(event)}`,
                    `**Fuseau :** ${event.timezone}`,
                    `**Lieux :** ${event.scopes.map(id => `<#${id}>`).join(", ") || "Aucun"}`,
                    `**Message :** ${event.message_content || "Message aléatoire de l’Entité"}`,
                    `**Dernière exécution :** ${event.last_run_key || "Jamais"}`
                ].join("\n"))],
            components: [
                new ActionRowBuilder().addComponents(scopeSelect),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("v2_help:staff_entities")
                        .setLabel("Aide").setEmoji("❓").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`v2_staff_entities_event_toggle:${event.id}`)
                        .setLabel(event.is_enabled ? "Désactiver" : "Activer").setStyle(ButtonStyle.Secondary).setDisabled(!writable),
                    new ButtonBuilder().setCustomId(`v2_staff_entities_event_delete:${event.id}`)
                        .setLabel("Supprimer").setStyle(ButtonStyle.Danger).setDisabled(!writable),
                    new ButtonBuilder().setCustomId(`v2_staff_entities_events:${event.entity_id}`)
                        .setLabel("Programmations").setStyle(ButtonStyle.Secondary)
                )
            ]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffEntitiesPage();

function formatSchedule(event) {
    const days = event.weekday_rule === "*" ? "tous les jours" : `jours ${event.weekday_rule}`;
    return `${event.calendar_rule} · ${days} · ${event.time_rule}`;
}
