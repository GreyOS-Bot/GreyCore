const {
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder
} = require("discord.js");
const policy = require("../../core/policies/StaffPermissionPolicy");
const manager = require("../../managers/NarrativeEntityV2Manager");
const page = require("../../pages/staff/StaffEntitiesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("v2_staff_entities_")) return false;
    if (!policy.canAccess(interaction, "entities")) {
        await replyError(interaction, "Tu n’as pas accès aux Entités.");
        return true;
    }
    const [action, entityId] = parse(interaction.customId);
    if (action === "open") {
        await interaction.update(page.buildDetail(interaction, entityId));
        return true;
    }
    if (!policy.canAccess(interaction, "entities", { write: true })) {
        await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
        return true;
    }
    try {
        if (action === "create") {
            await interaction.showModal(buildModal());
        } else if (action === "edit") {
            const entity = manager.getById(interaction.guildId, entityId);
            if (!entity) throw new Error("Cette Entité est introuvable.");
            await interaction.showModal(buildModal(entity));
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

function parse(customId) {
    const value = customId.slice("v2_staff_entities_".length);
    const separator = value.indexOf(":");
    return separator === -1 ? [value, null] : [value.slice(0, separator), value.slice(separator + 1)];
}

function buildModal(entity = null) {
    const field = (id, label, style, maxLength, required, value = null) => {
        const input = new TextInputBuilder().setCustomId(id).setLabel(label)
            .setStyle(style).setMaxLength(maxLength).setRequired(required);
        if (value) input.setValue(String(value).slice(0, maxLength));
        return new ActionRowBuilder().addComponents(input);
    };
    return new ModalBuilder()
        .setCustomId(entity ? `v2_staff_entities_edit_submit:${entity.id}` : "v2_staff_entities_create_submit")
        .setTitle(entity ? "Modifier l’Entité" : "Nouvelle Entité")
        .addComponents(
            field("name", "Nom", TextInputStyle.Short, 80, true, entity?.name),
            field("avatar_url", "Avatar — adresse web (facultatif)", TextInputStyle.Short, 1000, false, entity?.avatar_url),
            field("color", "Couleur d’embed", TextInputStyle.Short, 7, true, entity ? `#${entity.embed_color.toString(16).padStart(6, "0")}` : "#5865F2"),
            field("description", "Description (facultative)", TextInputStyle.Paragraph, 1000, false, entity?.description),
            field("messages", "Messages — un par ligne", TextInputStyle.Paragraph, 4000, true, entity?.messages.map(message => message.content).join("\n"))
        );
}
