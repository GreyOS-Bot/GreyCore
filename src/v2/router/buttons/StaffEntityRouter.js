const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
    FileUploadBuilder
} = require("discord.js");
const decisionService = require("../../core/services/StaffPermissionDecisionService");
const manager = require("../../managers/NarrativeEntityV2Manager");
const eventManager = require("../../managers/NarrativeEntityEventManager");
const page = require("../../pages/staff/StaffEntitiesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("v2_staff_entities_")) return false;
    if (!hasStrictEntityAccess(interaction, false)) {
        await replyError(interaction, "Tu n’as pas accès aux Entités.");
        return true;
    }
    const [action, entityId] = parse(interaction.customId);
    if (action === "open") {
        await interaction.update(page.buildDetail(interaction, entityId));
        return true;
    }
    if (action === "events") {
        await interaction.update(page.buildEvents(interaction, entityId));
        return true;
    }
    if (action === "event_open") {
        await interaction.update(page.buildEventDetail(interaction, entityId));
        return true;
    }
    if (!hasStrictEntityAccess(interaction, true)) {
        await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
        return true;
    }
    try {
        if (action === "create") {
            await interaction.showModal(buildModal());
        } else if (action === "broadcast") {
            const drafts = require("../../services/entities/NarrativeEntityBroadcastDraftService");
            drafts.clear(interaction.guildId, interaction.user.id);
            await interaction.update(page.buildBroadcast(
                interaction,
                drafts.get(interaction.guildId, interaction.user.id)
            ));
        } else if (action === "broadcast_cancel") {
            require("../../services/entities/NarrativeEntityBroadcastDraftService")
                .clear(interaction.guildId, interaction.user.id);
            await interaction.update(page.build(interaction));
        } else if (action === "broadcast_compose") {
            const draft = require("../../services/entities/NarrativeEntityBroadcastDraftService")
                .get(interaction.guildId, interaction.user.id);
            if (!draft.entityIds.length || !draft.channelIds.length) {
                throw new Error("Choisissez au moins une Entité et une destination.");
            }
            await interaction.showModal(buildBroadcastModal());
        } else if (action === "event_create") {
            await interaction.showModal(buildEventModal(entityId));
        } else if (action === "event_toggle") {
            const event = eventManager.toggle(interaction.guildId, entityId);
            await interaction.update(page.buildEventDetail(interaction, event.id));
        } else if (action === "event_delete") {
            const event = eventManager.getById(interaction.guildId, entityId);
            if (!event) throw new Error("Cette programmation est introuvable.");
            eventManager.delete(interaction.guildId, entityId);
            await interaction.update(page.buildEvents(interaction, event.entity_id));
        } else if (action === "edit") {
            const entity = manager.getById(interaction.guildId, entityId);
            if (!entity) throw new Error("Cette Entité est introuvable.");
            await interaction.showModal(buildModal(entity));
        } else if (action === "expressions") {
            const entity = manager.getById(interaction.guildId, entityId);
            if (!entity) throw new Error("Cette Entité est introuvable.");
            await interaction.showModal(buildExpressionsModal(entity));
        } else if (action === "toggle") {
            manager.toggle(interaction.guildId, entityId);
            await interaction.update(page.buildDetail(interaction, entityId));
        } else if (action === "delete") {
            await interaction.update(page.buildDetail(interaction, entityId, { confirmDelete: true }));
        } else if (action === "delete_confirm") {
            manager.delete(interaction.guildId, entityId);
            await interaction.update(page.build(interaction));
        } else return false;
    } catch (error) { await replyError(interaction, error); }
    return true;
};

function hasStrictEntityAccess(interaction, write) {
    return decisionService.decide({
        interaction,
        permission: "entities",
        write
    }).allowed;
}

function parse(customId) {
    const value = customId.slice("v2_staff_entities_".length);
    const separator = value.indexOf(":");
    return separator === -1 ? [value, null] : [value.slice(0, separator), value.slice(separator + 1)];
}

function buildBroadcastModal() {
    return new ModalBuilder()
        .setCustomId("v2_staff_entities_broadcast_submit")
        .setTitle("Diffusion manuelle")
        .addLabelComponents(
            new LabelBuilder()
                .setLabel("Titre des publications forum")
                .setDescription("Utilisé uniquement pour créer une publication dans un forum.")
                .setTextInputComponent(new TextInputBuilder()
                    .setCustomId("thread_name")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(100)
                    .setRequired(false)
                    .setPlaceholder("Annonce de l’Entité")),
            new LabelBuilder()
                .setLabel("Message")
                .setTextInputComponent(new TextInputBuilder()
                    .setCustomId("content")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(4000)
                    .setRequired(true))
        );
}

function buildEventModal(entityId) {
    const field = (id, label, value, description) => {
        const input = new TextInputBuilder().setCustomId(id).setStyle(TextInputStyle.Short)
            .setMaxLength(100).setRequired(true).setValue(value);
        const item = new LabelBuilder().setLabel(label).setTextInputComponent(input);
        if (description) item.setDescription(description);
        return item;
    };
    return new ModalBuilder().setCustomId(`v2_staff_entities_event_create_submit:${entityId}`)
        .setTitle("Programmer une apparition")
        .addLabelComponents(
            field("name", "Nom de la programmation", "Apparition programmée"),
            field("calendar", "Date ou période", "toujours", "toujours · 2026-10-31 · 10-31 · 2026-10-01..2026-10-31"),
            field("weekdays", "Jours", "tous", "tous ou lundi, vendredi, samedi"),
            field("time", "Heure ou plage horaire", "21:00", "21:00 ou 18:00-23:59"),
            field("timezone", "Fuseau horaire", "Europe/Paris")
        );
}

function buildModal(entity = null) {
    const field = (id, label, style, maxLength, required, value = null) => {
        const input = new TextInputBuilder().setCustomId(id)
            .setStyle(style).setMaxLength(maxLength).setRequired(required);
        if (value) input.setValue(String(value).slice(0, maxLength));
        return new LabelBuilder()
            .setLabel(label)
            .setTextInputComponent(input);
    };

    const avatar = new FileUploadBuilder()
        .setCustomId("avatar")
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false);

    return new ModalBuilder()
        .setCustomId(entity ? `v2_staff_entities_edit_submit:${entity.id}` : "v2_staff_entities_create_submit")
        .setTitle(entity ? "Modifier l’Entité" : "Nouvelle Entité")
        .addLabelComponents(
            field("name", "Nom", TextInputStyle.Short, 80, true, entity?.name),
            new LabelBuilder()
                .setLabel("Avatar (facultatif)")
                .setDescription(
                    entity
                        ? "Ajoutez une image uniquement pour remplacer l’avatar actuel."
                        : "Envoyez directement l’image qui représentera cette Entité."
                )
                .setFileUploadComponent(avatar),
            field("color", "Couleur d’embed", TextInputStyle.Short, 7, true, entity ? `#${entity.embed_color.toString(16).padStart(6, "0")}` : "#5865F2"),
            field("description", "Description (facultative)", TextInputStyle.Paragraph, 1000, false, entity?.description),
            field("messages", "Messages — un par ligne", TextInputStyle.Paragraph, 4000, true, entity?.messages.map(message => message.content).join("\n"))
        );
}

function buildExpressionsModal(entity) {
    const input = new TextInputBuilder()
        .setCustomId("expressions")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(4000)
        .setPlaceholder("déesse\nviens à nous\non invoque Goddess");
    if (entity.expressions.length) {
        input.setValue(
            entity.expressions.map(item => item.expression).join("\n").slice(0, 4000)
        );
    }
    return new ModalBuilder()
        .setCustomId(`v2_staff_entities_expressions_submit:${entity.id}`)
        .setTitle("Mots et expressions d’appel")
        .addLabelComponents(
            new LabelBuilder()
                .setLabel("Un mot ou une expression par ligne")
                .setDescription(`Le nom « ${entity.name} » fonctionne déjà automatiquement.`)
                .setTextInputComponent(input)
        );
}
