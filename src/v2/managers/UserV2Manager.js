const repository =
    require(
        "../repositories/UserRepository"
    );

class UserV2Manager {

    getById(
        userId
    ) {
        return repository
            .getById(
                userId
            );
    }

    getByDiscordUserId(
        discordUserId
    ) {
        return repository
            .getByDiscordUserId(
                discordUserId
            );
    }

    getOrCreate(
        discordUserId
    ) {
        return (
            this.getByDiscordUserId(
                discordUserId
            )
            || repository.insert(
                discordUserId,
                new Date()
                    .toISOString()
            )
        );
    }

    touch(
        userId
    ) {
        return repository.touch(
            userId,
            new Date()
                .toISOString()
        );
    }

}

module.exports =
    new UserV2Manager();
