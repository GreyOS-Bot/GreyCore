const decisionService = require("../../core/services/StaffPermissionDecisionService");
const manager = require("../../managers/NarrativeEntityV2Manager");
const eventManager = require("../../managers/NarrativeEntityEventManager");
const page = require("../../pages/staff/StaffEntitiesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.customId?.startsWith("v2_staff_entities_")) return false;
    if (!hasStrictEntityAccess(interaction, false)) {
        await replyError(interaction, "Tu n’as pas accès aux Entités.");
        return true;
    }
    if (interaction.customId === "v2_staff_entities_select") {
        await interaction.update(page.buildDetail(interaction, interaction.values[0]));
        return true;
    }
    if (
        interaction.customId === "v2_staff_entities_broadcast_entities"
        || interaction.customId === "v2_staff_entities_broadcast_channels"
    ) {
        if (!hasStrictEntityAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        const drafts = require("../../services/entities/NarrativeEntityBroadcastDraftService");
        const values = interaction.customId.endsWith("_entities")
            ? { entityIds: interaction.values }
            : { channelIds: interaction.values };
        const draft = drafts.update(interaction.guildId, interaction.user.id, values);
        await interaction.update(page.buildBroadcast(interaction, draft));
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_event_select:")) {
        await interaction.update(page.buildEventDetail(interaction, interaction.values[0]));
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_event_scopes:")) {
        if (!hasStrictEntityAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        const eventId = interaction.customId.slice("v2_staff_entities_event_scopes:".length);
        try {
            eventManager.setScopes(interaction.guildId, eventId, interaction.values);
            await interaction.update(page.buildEventDetail(interaction, eventId));
        } catch (error) { await replyError(interaction, error); }
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_triggers:")) {
        if (!hasStrictEntityAccess(interaction, true)) {
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
        if (!hasStrictEntityAccess(interaction, true)) {
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

function hasStrictEntityAccess(interaction, write) {
    return decisionService.decide({
        interaction,
        permission: "entities",
        write
    }).allowed;
}
