const manager = require("../../managers/SceneAssistantV2Manager");
const policy = require("../../core/policies/StaffPermissionPolicy");
const page = require("../../pages/staff/StaffScenesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.customId?.startsWith("v2_staff_scenes_")) return false;
    if (!policy.canAccess(interaction, "scenes", { write: true })) {
        await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
        return true;
    }

    try {
        if (interaction.customId === "v2_staff_scenes_expression_submit") {
            manager.addTriggerExpression({
                guildId: interaction.guildId,
                expression: interaction.fields.getTextInputValue("expression"),
                createdBy: interaction.user.id
            });
        } else if (interaction.customId === "v2_staff_scenes_config_submit") {
            manager.configure({
                guildId: interaction.guildId,
                durationDays: optionalInteger(interaction, "duration_days"),
                recommendedMessageCount: optionalInteger(interaction, "message_count"),
                inactivityHours: requiredInteger(interaction, "inactivity_hours")
            });
        } else {
            return false;
        }
        await interaction.update(page.build(interaction));
    } catch (error) {
        await replyError(interaction, error);
    }
    return true;
};

function optionalInteger(interaction, field) {
    const raw = interaction.fields.getTextInputValue(field).trim();
    if (!raw) return null;
    return parsePositiveInteger(raw, field);
}

function requiredInteger(interaction, field) {
    return parsePositiveInteger(
        interaction.fields.getTextInputValue(field).trim(),
        field
    );
}

function parsePositiveInteger(raw, field) {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Le champ ${field} doit contenir un nombre entier positif.`);
    }
    return value;
}
