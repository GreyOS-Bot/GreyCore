const guildManagementPolicy =
    require(
        "./GuildManagementPolicy"
    );

const guildSettingsManager =
    require(
        "../../managers/GuildSettingsV2Manager"
    );

const {
    PermissionFlagsBits
} = require("discord.js");

class ValidationStaffPolicy {

    getGuildId(
        interaction
    ) {
        return (
            interaction.guildId
            || interaction.guild?.id
            || null
        );
    }

    getValidationChannel(
        interaction,
        validationChannelId
    ) {
        const caches = [
            interaction.guild?.channels?.cache,
            interaction.client?.channels?.cache
        ];

        for (const cache of caches) {
            const channel =
                cache?.get(
                    String(validationChannelId)
                );

            if (channel) {
                return channel;
            }
        }

        return null;
    }

    canManageServerTools(
        interaction
    ) {
        if (
            guildManagementPolicy.canManage(
                interaction
            )
        ) {
            return true;
        }

        const guildId =
            this.getGuildId(interaction);

        if (!guildId) {
            return false;
        }

        const validationChannelId =
            guildSettingsManager
                .getValidationChannelId(
                    guildId
                );

        if (!validationChannelId) {
            return false;
        }

        const validationChannel =
            this.getValidationChannel(
                interaction,
                validationChannelId
            );

        const member =
            interaction.member
            || interaction.user
            || null;

        const permissions =
            validationChannel
                ?.permissionsFor?.(member)
            || null;

        return Boolean(
            permissions?.has(
                PermissionFlagsBits.ViewChannel
            )
        );
    }

    canReview(interaction) {
        if (
            guildManagementPolicy.canManage(
                interaction
            )
        ) {
            return true;
        }

        const guildId =
            this.getGuildId(interaction);

        const channelId =
            interaction.channelId
            || interaction.channel?.id
            || null;

        if (!guildId || !channelId) {
            return false;
        }

        const validationChannelId =
            guildSettingsManager
                .getValidationChannelId(
                    guildId
                );

        /*
         * Une personne ne peut cliquer sur la carte que si
         * Discord lui donne déjà accès à ce salon. Cet accès
         * suffit donc pour participer aux validations.
         */
        return Boolean(
            validationChannelId
            && String(validationChannelId) ===
                String(channelId)
        );
    }

}

module.exports =
    new ValidationStaffPolicy();
