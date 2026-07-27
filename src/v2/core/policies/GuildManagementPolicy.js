const {
    PermissionsBitField
} = require("discord.js");

class GuildManagementPolicy {

    getPermissions(
        interaction
    ) {
        return (
            interaction
                .memberPermissions
            || interaction
                .member
                ?.permissions
            || null
        );
    }

    isInGuild(
        interaction
    ) {
        return Boolean(
            interaction.guildId
            || interaction.guild?.id
        );
    }

    isAdministrator(
        interaction
    ) {
        return Boolean(
            this.isInGuild(
                interaction
            )
            && this.getPermissions(
                interaction
            )?.has(
                PermissionsBitField
                    .Flags
                    .Administrator
            )
        );
    }

    canManage(
        interaction
    ) {
        const permissions =
            this.getPermissions(
                interaction
            );

        return Boolean(
            this.isInGuild(
                interaction
            )
            && (
                permissions?.has(
                    PermissionsBitField
                        .Flags
                        .ManageGuild
                )
                || permissions?.has(
                    PermissionsBitField
                        .Flags
                        .Administrator
                )
            )
        );
    }

}

module.exports =
    new GuildManagementPolicy();
