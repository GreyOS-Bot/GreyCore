const characterManager =
    require("./CharacterV2Manager");

const repository =
    require(
        "../repositories/CharacterAliasRepository"
    );

class CharacterAliasV2Manager {

    getForCharacter(characterId) {
        return repository.getForCharacter(characterId);
    }

    add(
        characterId,
        alias
    ) {
        const character =
            characterManager.requireCharacter(characterId);

        const normalizedAlias =
            this.normalize(alias);

        const primaryCharacter =
            characterManager.getByProxyName(
                character.owner_user_id,
                normalizedAlias
            );

        if (primaryCharacter) {
            throw new Error(
                "Ce nom est d\u00e9j\u00e0 utilis\u00e9 comme proxy d'un personnage."
            );
        }

        const existingAlias =
            repository.getForOwnerByAlias(
                character.owner_user_id,
                normalizedAlias
            );

        if (existingAlias) {
            throw new Error(
                "Cet alias est d\u00e9j\u00e0 utilis\u00e9 par un de tes personnages."
            );
        }

        return repository.create({
            characterId:
                character.id,
            alias:
                normalizedAlias,
            createdAt:
                new Date().toISOString()
        });
    }

    remove(
        characterId,
        aliasId
    ) {
        const result = repository.delete(
            characterId,
            Number(aliasId)
        );

        if (!result.changes) {
            throw new Error(
                "Cet alias est introuvable."
            );
        }
    }

    normalize(alias) {
        const normalizedAlias =
            String(alias || "")
                .normalize("NFC")
                .trim();

        if (!normalizedAlias) {
            throw new Error(
                "Un alias est obligatoire."
            );
        }

        if (normalizedAlias.length > 32) {
            throw new Error(
                "Un alias ne peut pas d\u00e9passer 32 caract\u00e8res."
            );
        }

        return normalizedAlias;
    }

}

module.exports =
    new CharacterAliasV2Manager();
