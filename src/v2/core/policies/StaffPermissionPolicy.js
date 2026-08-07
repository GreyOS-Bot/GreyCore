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

        if (!manager.hasConfiguration(guildId)) {
            return validationStaffPolicy.canManageServerTools(interaction)
                ? ["*"]
                : [];
        }

        return manager.getPermissionsForRoles(
            guildId,
            this.getRoleIds(interaction)
        );
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
}

module.exports = new StaffPermissionPolicy();
