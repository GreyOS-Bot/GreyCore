const rosterRepository =
    require(
        "../repositories/CharacterRosterRepository"
    );

const characterManager =
    require("./CharacterV2Manager");

class CharacterRosterV2Manager {

    getRoster(
        guildId,
        options = {}
    ) {
        return rosterRepository.getRoster(
            guildId,
            options.includeArchived === true
        );
    }

    getByOwnerOnGuild(
        guildId,
        discordUserId
    ) {
        return rosterRepository.getByOwnerOnGuild(
            guildId,
            discordUserId
        );
    }

    archiveOwnerCharacters(
        guildId,
        discordUserId
    ) {
        const characters =
            this.getByOwnerOnGuild(
                guildId,
                discordUserId
            )
            .filter(character =>
                !character.is_archived
            );

        return {
            characters,
            updated:
                characters.map(character =>
                    characterManager.setArchived(
                        character.id,
                        true
                    )
                )
        };
    }

    restoreOwnerCharacters(
        guildId,
        discordUserId
    ) {
        const characters =
            this.getByOwnerOnGuild(
                guildId,
                discordUserId
            )
            .filter(character =>
                character.is_archived
            );

        return {
            characters,
            updated:
                characters.map(character =>
                    characterManager.setArchived(
                        character.id,
                        false
                    )
                )
        };
    }

    deleteOwnerCharacters(
        guildId,
        discordUserId
    ) {
        const characters =
            this.getByOwnerOnGuild(
                guildId,
                discordUserId
            );

        return {
            characters,
            deleted:
                characters.map(character =>
                    characterManager.delete(
                        character.id
                    )
                )
        };
    }

}

module.exports =
    new CharacterRosterV2Manager();
