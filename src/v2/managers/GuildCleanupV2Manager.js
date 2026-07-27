const repository =
    require(
        "../repositories/GuildCleanupRepository"
    );

class GuildCleanupV2Manager {

    cleanupDeletedGuild(
        guildId
    ) {
        return repository
            .cleanupDeletedGuild(
                guildId
            );
    }

}

module.exports =
    new GuildCleanupV2Manager();
