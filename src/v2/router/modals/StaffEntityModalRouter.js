const policy = require("../../core/policies/StaffPermissionPolicy");
const manager = require("../../managers/NarrativeEntityV2Manager");
const page = require("../../pages/staff/StaffEntitiesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.isModalSubmit?.() || !interaction.customId?.startsWith("v2_staff_entities_")) return false;
    if (!policy.canAccess(interaction, "entities", { write: true })) {
        await replyError(interaction, "Tu ne peux pas modifier les Entités.");
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_expressions_submit:")) {
        const entityId = interaction.customId.slice(
            "v2_staff_entities_expressions_submit:".length
        );
        try {
            manager.setExpressions(
                interaction.guildId,
                entityId,
                interaction.fields.getTextInputValue("expressions")
            );
            await interaction.update(page.buildDetail(interaction, entityId));
        } catch (error) { await replyError(interaction, error); }
        return true;
    }
    const uploads = interaction.fields.getUploadedFiles("avatar", false);
    const attachment = uploads?.size
        ? Array.from(uploads.values())[0]
        : null;
    if (
        attachment
        && !require("../../services/outfits/OutfitImageStorageService")
            .isImage(attachment)
    ) {
        await replyError(interaction, "Le fichier de l’avatar doit être une image.");
        return true;
    }

    const entityId = interaction.customId.startsWith("v2_staff_entities_edit_submit:")
        ? interaction.customId.slice("v2_staff_entities_edit_submit:".length)
        : null;
    const currentEntity = entityId
        ? manager.getById(interaction.guildId, entityId)
        : null;
    const values = {
        guildId: interaction.guildId,
        createdBy: interaction.user.id,
        name: interaction.fields.getTextInputValue("name"),
        avatarUrl: attachment?.url || currentEntity?.avatar_url || null,
        color: interaction.fields.getTextInputValue("color"),
        description: interaction.fields.getTextInputValue("description"),
        messagesText: interaction.fields.getTextInputValue("messages")
    };
    try {
        let entity;
        if (interaction.customId === "v2_staff_entities_create_submit") {
            entity = manager.create(values);
        } else if (interaction.customId.startsWith("v2_staff_entities_edit_submit:")) {
            entity = manager.update({
                ...values,
                entityId
            });
        } else return false;
        await interaction.update(page.buildDetail(interaction, entity.id));
    } catch (error) { await replyError(interaction, error); }
    return true;
};
