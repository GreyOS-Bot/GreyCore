const repository =
    require(
        "../repositories/GuildSettingsRepository"
    );

class GuildSettingsV2Manager {

    get(
        guildId
    ) {
        return repository
            .get(
                guildId
            );
    }

    ensure(
        guildId
    ) {
        return (
            this.get(
                guildId
            )
            || repository.insert(
                guildId,
                new Date()
                    .toISOString()
            )
        );
    }

    setValidationChannel(
        guildId,
        channelId
    ) {
        return repository
            .setValidationChannel(
                guildId,
                channelId,
                new Date()
                    .toISOString()
            );
    }

    removeValidationChannel(
        guildId
    ) {
        this.ensure(
            guildId
        );

        return repository
            .removeValidationChannel(
                guildId,
                new Date()
                    .toISOString()
            );
    }

    getValidationChannelId(
        guildId
    ) {
        return (
            this.get(
                guildId
            )
                ?.validation_channel_id
            || null
        );
    }

    setErrorLogChannel(
        guildId,
        channelId
    ) {
        return repository
            .setErrorLogChannel(
                guildId,
                channelId,
                new Date()
                    .toISOString()
            );
    }

    removeErrorLogChannel(
        guildId
    ) {
        return repository
            .removeErrorLogChannel(
                guildId,
                new Date()
                    .toISOString()
            );
    }

    getErrorLogChannelId(
        guildId
    ) {
        return (
            this.get(
                guildId
            )
                ?.error_log_channel_id
            || null
        );
    }

}

module.exports =
    new GuildSettingsV2Manager();
