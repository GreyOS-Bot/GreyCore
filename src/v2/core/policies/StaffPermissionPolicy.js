const { PermissionFlagsBits } = require("discord.js");
const decisionService = require("../services/StaffPermissionDecisionService");

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

    getGrantedPermissions(interaction) {
        return decisionService.getGrantedPermissions({ interaction });
    }

    canAccess(interaction, permissionKey, { write = false } = {}) {
        return decisionService.decide({
            interaction,
            permission: permissionKey,
            write,
            legacyCanAccessParity: true
        }).allowed;
    }

    canOpenCenter(interaction) {
        return this.getGrantedPermissions(interaction).length > 0;
    }

    canManageCharacters(interaction) {
        return this.canAccess(interaction, "characters", { write: true });
    }
}

module.exports = new StaffPermissionPolicy();
