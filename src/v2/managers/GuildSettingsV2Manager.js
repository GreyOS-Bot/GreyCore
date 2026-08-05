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

    configurePlayedCharacterCreationLimit(
        guildId,
        {
            enabled,
            limitCount = 2,
            windowDays = 7
        }
    ) {
        if (
            !Number.isInteger(limitCount)
            || limitCount < 1
            || limitCount > 100
        ) {
            throw new Error(
                "La limite doit être comprise entre 1 et 100 PJ."
            );
        }

        if (
            !Number.isInteger(windowDays)
            || windowDays < 1
            || windowDays > 365
        ) {
            throw new Error(
                "La période doit être comprise entre 1 et 365 jours."
            );
        }

        return repository
            .setPlayedCharacterCreationLimit(
                guildId,
                {
                    enabled:
                        enabled === true,
                    limitCount,
                    windowDays
                },
                new Date().toISOString()
            );
    }

    getPlayedCharacterCreationLimit(
        guildId
    ) {
        const settings = this.get(guildId);

        return {
            enabled:
                Number(
                    settings
                        ?.pj_creation_limit_enabled
                    || 0
                ) === 1,
            limitCount:
                Number(
                    settings
                        ?.pj_creation_limit_count
                    || 2
                ),
            windowDays:
                Number(
                    settings
                        ?.pj_creation_limit_window_days
                    || 7
                )
        };
    }

}

module.exports =
    new GuildSettingsV2Manager();
