const { PermissionFlagsBits } = require("discord.js");
const manager = require("../../managers/StaffPermissionV2Manager");
const validationStaffPolicy = require("./ValidationStaffPolicy");

class StaffPermissionPolicy {
    isServerOwner(interaction) {
        return Boolean(
            interaction.guild?.ownerId
            && interaction.user?.id === interaction.guild.ownerId
        );
    }

    isDiscordAdministrator(interaction) {
        return Boolean(
            interaction.memberPermissions?.has?.(
                PermissionFlagsBits.Administrator
            )
            || interaction.member?.permissions?.has?.(
                PermissionFlagsBits.Administrator
            )
        );
    }

    canManagePermissions(interaction) {
        return this.isServerOwner(interaction)
            || this.isDiscordAdministrator(interaction);
    }

    getRoleIds(interaction) {
        const cache = interaction.member?.roles?.cache;
        if (cache?.keys) {
            return [...cache.keys()].map(String);
        }
        if (Array.isArray(interaction.member?.roles)) {
            return interaction.member.roles.map(String);
        }
        return [];
    }

    getGrantedPermissions(interaction) {
        if (this.canManagePermissions(interaction)) {
            return ["*"];
        }

        const guildId = interaction.guildId || interaction.guild?.id;
        if (!guildId) return [];

        const permissions = new Set(manager.getPermissionsForRoles(
            guildId,
            this.getRoleIds(interaction)
        ));
        for (const permission of manager.getUserPermissions(
            guildId,
            interaction.user?.id
        )) {
            permissions.add(permission);
        }

        if (
            manager.getValidationChannelAccess(guildId)
            && validationStaffPolicy.canManageServerTools(interaction)
        ) {
            permissions.add("*");
        }

        return [...permissions];
    }

    canAccess(interaction, permissionKey, { write = false } = {}) {
        const granted = this.getGrantedPermissions(interaction);
        if (granted.includes("*") || granted.includes(permissionKey)) {
            return true;
        }
        return !write && granted.includes("read_only");
    }

    canOpenCenter(interaction) {
        return this.getGrantedPermissions(interaction).length > 0;
    }

    canManageCharacters(interaction) {
        return this.canAccess(interaction, "characters", { write: true });
    }
}

module.exports = new StaffPermissionPolicy();
