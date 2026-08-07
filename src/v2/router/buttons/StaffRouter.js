module.exports = async interaction => {
    if (!interaction.isButton?.()) return false;

    if (interaction.customId === "v2_staff_permissions_toggle_validation") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const manager = require("../../managers/StaffPermissionV2Manager");
        const page = require("../../pages/staff/StaffPermissionsPage");
        const { replyError } = require(
            "../../core/services/InteractionResponseService"
        );

        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }

        const current = manager.getValidationChannelAccess(
            interaction.guildId
        );
        manager.setValidationChannelAccess({
            guildId: interaction.guildId,
            enabled: !current,
            updatedBy: interaction.user.id
        });
        await interaction.update(
            page.buildAccessSelection(interaction.guildId)
        );
        return true;
    }

    if (interaction.customId !== "staff_close") return false;

    await interaction.update({
        content: "✅ Centre d'administration fermé.",
        embeds: [],
        components: []
    });
    return true;
};
