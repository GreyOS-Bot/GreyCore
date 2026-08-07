const policy = require("../../core/policies/StaffPermissionPolicy");
const manager = require("../../managers/NarrativeEntityV2Manager");
const page = require("../../pages/staff/StaffEntitiesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.customId?.startsWith("v2_staff_entities_")) return false;
    if (!policy.canAccess(interaction, "entities")) {
        await replyError(interaction, "Tu n’as pas accès aux Entités.");
        return true;
    }
    if (interaction.customId === "v2_staff_entities_select") {
        await interaction.update(page.buildDetail(interaction, interaction.values[0]));
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_triggers:")) {
        if (!policy.canAccess(interaction, "entities", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        const entityId = interaction.customId.slice("v2_staff_entities_triggers:".length);
        try {
            manager.setTriggers(interaction.guildId, entityId, interaction.values);
            await interaction.update(page.buildDetail(interaction, entityId));
        } catch (error) { await replyError(interaction, error); }
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_scopes:")) {
        if (!policy.canAccess(interaction, "entities", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        const entityId = interaction.customId.slice("v2_staff_entities_scopes:".length);
        try {
            manager.setScopes(interaction.guildId, entityId, interaction.values);
            await interaction.update(page.buildDetail(interaction, entityId));
        } catch (error) { await replyError(interaction, error); }
        return true;
    }
    return false;
};
