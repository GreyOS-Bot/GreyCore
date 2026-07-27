const repository =
    require(
        "../repositories/LibraryRepository"
    );

class LibraryManager {

    getCharacters(
        userId
    ) {
        return repository
            .getCharacters(
                userId
            );
    }

    getArchivedCharacters(
        userId
    ) {
        return repository
            .getArchivedCharacters(
                userId
            );
    }

    getCharacter(
        characterId
    ) {
        return repository
            .getCharacter(
                characterId
            );
    }

    getCharacterForUser(
        characterId,
        userId
    ) {
        return repository
            .getCharacterForUser(
                characterId,
                userId
            );
    }

    searchCharacters(
        userId,
        search
    ) {
        return repository
            .searchCharacters(
                userId,
                String(
                    search
                    || ""
                ).trim()
            );
    }

    getContinuities(
        characterId
    ) {
        return repository
            .getContinuities(
                characterId
            );
    }

    getStatistics(
        userId
    ) {
        return repository
            .getStatistics(
                userId
            );
    }

}

module.exports =
    new LibraryManager();
