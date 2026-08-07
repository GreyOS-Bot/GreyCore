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
    const values = {
        guildId: interaction.guildId,
        createdBy: interaction.user.id,
        name: interaction.fields.getTextInputValue("name"),
        avatarUrl: interaction.fields.getTextInputValue("avatar_url"),
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
                entityId: interaction.customId.slice("v2_staff_entities_edit_submit:".length)
            });
        } else return false;
        await interaction.update(page.buildDetail(interaction, entity.id));
    } catch (error) { await replyError(interaction, error); }
    return true;
};
