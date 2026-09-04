const manager = require("../../managers/SceneAssistantV2Manager");
const policy = require("../../core/policies/StaffPermissionPolicy");
const administrativeAccess = require("../../core/services/AdministrativePermissionAccessService");
const page = require("../../pages/staff/StaffScenesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (interaction.customId === "v2_staff_settings_advanced_set_submit") {
        if (!administrativeAccess.canWrite(interaction, "settings")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        try {
            require("../../managers/GuildAdvancedSettingV2Manager").set(
                interaction.guildId,
                interaction.fields.getTextInputValue("key"),
                interaction.fields.getTextInputValue("value")
            );
            await interaction.update(
                require("../../pages/staff/StaffSettingsPage").buildAdvanced(interaction)
            );
        } catch (error) {
            await replyError(interaction, error);
        }
        return true;
    }
    if (interaction.customId?.startsWith("v2_staff_characters_cancel_installation_submit:")) {
        const validationAccess = require("../../core/services/ValidationPermissionAccessService");
        if (!validationAccess.canWrite(interaction)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        try {
            await interaction.deferUpdate();
            const installationId = interaction.customId.split(":")[1];
            const validationManager = require("../../services/validation/ValidationManagerV2");
            const previousInstallation = validationManager.getInstallation(installationId);
            const result = validationManager.cancelIncompleteInstallation({
                installationId,
                guildId: interaction.guildId,
                cancelledBy: interaction.user.id,
                reason: interaction.fields.getTextInputValue("reason")
            });
            await require("../../services/validation/ValidationMessageCleanupService")
                .remove(interaction.client, previousInstallation);
            await interaction.editReply({
                content: `✅ L’installation de **${result.context.proxy_name}** a été annulée. Le personnage n’a pas été supprimé.`,
                embeds: [],
                components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
            });
        } catch (error) {
            await require("../../core/services/InteractionResponseService")
                .editOrReplyError(interaction, error, { embeds: [], components: [] });
        }
        return true;
    }
    if (interaction.customId === "v2_staff_universe_create_state_submit") {
        if (!require("../../core/services/StaffPermissionDecisionService").decide({
            interaction,
            permission: "characters",
            write: true
        }).allowed) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const color = interaction.fields.getTextInputValue("color").trim();
        if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
            await replyError(interaction, "La couleur doit être au format hexadécimal, par exemple `#E67E22`.");
            return true;
        }
        try {
            require("../../managers/StateTypeV2Manager").createStateType({
                guildId: interaction.guildId,
                name: interaction.fields.getTextInputValue("name"),
                emoji: interaction.fields.getTextInputValue("emoji"),
                color: color || "#2B2D31",
                createdBy: interaction.user.id
            });
        } catch (error) {
            await replyError(interaction, error);
            return true;
        }
        await interaction.update(require("../../pages/staff/StaffUniversePage").build(interaction));
        return true;
    }
    if (interaction.customId === "v2_staff_relationships_create_type_submit") {
        if (!policy.canAccess(interaction, "relationships", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const symmetricValue = interaction.fields.getTextInputValue("symmetric").trim().toLowerCase();
        if (!["oui", "non"].includes(symmetricValue)) {
            await replyError(interaction, "Indique `oui` ou `non` pour la relation symétrique.");
            return true;
        }
        try {
            require("../../managers/RelationshipTypeV2Manager").create({
                guildId: interaction.guildId,
                labelAToB: interaction.fields.getTextInputValue("label_a_to_b"),
                labelBToA: interaction.fields.getTextInputValue("label_b_to_a"),
                isSymmetric: symmetricValue === "oui"
            });
        } catch (error) {
            await replyError(interaction, error);
            return true;
        }
        await interaction.update(require("../../pages/staff/StaffRelationshipsPage").build(interaction));
        return true;
    }
    if (interaction.customId === "v2_staff_automations_approval_submit") {
        if (!administrativeAccess.canWrite(interaction, "automations")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const drafts = require("../../services/automation/ApprovalAutomationDraftService");
        const draft = drafts.get(interaction.guildId, interaction.user.id);
        if (!draft) {
            await replyError(interaction, "Cette configuration a expiré. Ouvre-la de nouveau.");
            return true;
        }
        try {
            require("../../managers/CharacterApprovalAutomationV2Manager").configure({
                guildId: interaction.guildId,
                approvedCharacterCount: Number(interaction.fields.getTextInputValue("approved_count")),
                requiredRoleId: draft.requiredRoleId,
                removeRoleId: draft.removeRoleId,
                addRoleId: draft.addRoleId,
                welcomeChannelId: draft.welcomeChannelId,
                welcomeMessage: interaction.fields.getTextInputValue("welcome_message")
            });
        } catch (error) {
            await replyError(interaction, error);
            return true;
        }
        drafts.clear(interaction.guildId, interaction.user.id);
        await interaction.update(require("../../pages/staff/StaffAutomationsPage").build(interaction));
        return true;
    }
    if (interaction.customId === "v2_staff_settings_maintenance_submit") {
        if (!administrativeAccess.canWrite(interaction, "settings")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const settings = require("../../managers/GuildSettingsV2Manager");
        const current = settings.getMaintenance(interaction.guildId);
        settings.setMaintenance(interaction.guildId, {
            enabled: current.enabled,
            message: interaction.fields.getTextInputValue("message")
        });
        await interaction.update(require("../../pages/staff/StaffSettingsPage").build(interaction));
        return true;
    }
    if (interaction.customId === "v2_staff_automations_creation_limit_submit") {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!administrativeAccess.canWrite(interaction, "automations")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const limitCount = Number(interaction.fields.getTextInputValue("limit_count"));
        const windowDays = Number(interaction.fields.getTextInputValue("window_days"));
        try {
            require("../../managers/GuildSettingsV2Manager").configurePlayedCharacterCreationLimit(
                interaction.guildId,
                { enabled: true, limitCount, windowDays }
            );
        } catch (error) {
            await replyError(interaction, error);
            return true;
        }
        await interaction.update(require("../../pages/staff/StaffAutomationsPage").build(interaction));
        return true;
    }
    if (!interaction.customId?.startsWith("v2_staff_scenes_")) return false;
    if (!administrativeAccess.canWrite(interaction, "scenes")) {
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
