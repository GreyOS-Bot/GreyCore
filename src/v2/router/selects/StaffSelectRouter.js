const page = require("../../pages/staff/StaffPermissionsPage");
const policy = require("../../core/policies/StaffPermissionPolicy");
const manager = require("../../managers/StaffPermissionV2Manager");
const { replyError } = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    if (interaction.customId === "v2_staff_permissions_role") {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }
        await interaction.update(
            page.buildPermissionSelection(
                interaction.guildId,
                interaction.values[0],
                "role"
            )
        );
        return true;
    }

    if (interaction.customId === "v2_staff_permissions_user") {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }
        await interaction.update(
            page.buildPermissionSelection(
                interaction.guildId,
                interaction.values[0],
                "user"
            )
        );
        return true;
    }

    if (interaction.customId?.startsWith("v2_staff_permissions_save:")) {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }

        const [, subjectType, subjectId] =
            interaction.customId.split(":");
        const selected = interaction.values.includes("__none__")
            ? []
            : interaction.values;
        const saved = subjectType === "user"
            ? manager.replaceUserPermissions({
                guildId: interaction.guildId,
                discordUserId: subjectId,
                permissionKeys: selected,
                grantedBy: interaction.user.id
            })
            : manager.replaceRolePermissions({
                guildId: interaction.guildId,
                roleId: subjectId,
                permissionKeys: selected,
                grantedBy: interaction.user.id
            });
        const subjectMention = subjectType === "user"
            ? `<@${subjectId}>`
            : `<@&${subjectId}>`;

        await interaction.update({
            content: saved.length
                ? `✅ Permissions de ${subjectMention} enregistrées : **${saved.length}** domaine(s).`
                : `✅ Toutes les permissions GreyCore de ${subjectMention} ont été retirées.`,
            embeds: [],
            components: [
                require("discord.js").ActionRowBuilder.from({
                    type: 1,
                    components: [{
                        type: 2,
                        custom_id: "page:staff:section:permissions",
                        label: "Configurer un autre rôle",
                        emoji: { name: "🔐" },
                        style: 2
                    }, {
                        type: 2,
                        custom_id: "page:staff:home:root",
                        label: "Accueil",
                        emoji: { name: "🏠" },
                        style: 2
                    }]
                })
            ]
        });
        return true;
    }

    return false;
};
