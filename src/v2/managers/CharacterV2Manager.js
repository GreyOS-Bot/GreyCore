const crypto =
    require("crypto");

const repository =
    require(
        "../repositories/CharacterRepository"
    );

class CharacterV2Manager {

    generateId() {
        return (
            `charv2_${crypto.randomUUID()}`
        );
    }

    getById(
        characterId
    ) {
        return repository
            .getById(
                characterId
            );
    }

    getByOwner(
        ownerUserId
    ) {
        return repository
            .getByOwner(
                ownerUserId
            );
    }

    getByOwnerDiscordId(
        discordUserId
    ) {
        return repository
            .getByOwnerDiscordId(
                discordUserId
            );
    }

    searchOwnedPlayableCharacters(
        options
    ) {
        return repository
            .searchOwnedPlayableCharacters(
                options
            );
    }

    getByProxyName(
        ownerUserId,
        proxyName
    ) {
        return repository
            .getByProxyName(
                ownerUserId,
                String(
                    proxyName
                    || ""
                ).trim()
            );
    }

    create(
        data
    ) {
        const proxyName =
            this.normalizeProxyName(
                data.proxyName
            );

        const existing =
            this.getByProxyName(
                data.ownerUserId,
                proxyName
            );

        if (existing) {
            throw new Error(
                "Un personnage portant ce nom existe déjà dans cette bibliothèque."
            );
        }

        if (data.characterType === "pj_masque") {
            if (!data.maskedParentCharacterId) {
                throw new Error("Choisis le PJ principal de cette version masquée.");
            }
            const parent = this.requireCharacter(data.maskedParentCharacterId);
            if (parent.character_type !== "personnage_joue"
                || String(parent.owner_user_id) !== String(data.ownerUserId)) {
                throw new Error("Le PJ principal choisi est invalide.");
            }
        }
        const now =
            new Date()
                .toISOString();

        return repository.insert({
            id:
                data.id
                || this.generateId(),
            ownerUserId:
                data.ownerUserId,
            proxyName,
            avatarUrl:
                data.avatarUrl
                || null,
            baseFirstname:
                data.baseFirstname
                    ?.trim()
                || null,
            baseLastname:
                data.baseLastname
                    ?.trim()
                || null,
            characterType:
                data.characterType
                || "personnage_joue",
            maskedParentCharacterId:
                data.maskedParentCharacterId || null,
            isArchived:
                data.isArchived
                    ? 1
                    : 0,
            createdAt:
                data.createdAt
                || now,
            updatedAt:
                data.updatedAt
                || now
        });
    }

    setMaskedParent(characterId, parentCharacterId) {
        const character = this.requireCharacter(characterId);
        const parent = this.requireCharacter(parentCharacterId);
        if (character.character_type !== "pj_masque") {
            throw new Error("Seule une version masquée peut être reliée à un PJ.");
        }
        if (parent.character_type !== "personnage_joue") {
            throw new Error("Le personnage principal doit être un PJ.");
        }
        if (String(character.owner_user_id) !== String(parent.owner_user_id)) {
            throw new Error("Le PJ masqué et le PJ principal doivent appartenir au même utilisateur.");
        }
        return repository.setMaskedParent(characterId, parentCharacterId, new Date().toISOString());
    }
    updateIdentity(
        characterId,
        data
    ) {
        const character =
            this.requireCharacter(
                characterId
            );

        const proxyName =
            data.proxyName ===
                undefined
                ? character
                    .proxy_name
                : this
                    .normalizeProxyName(
                        data.proxyName
                    );

        const avatarUrl =
            data.avatarUrl ===
                undefined
                ? character
                    .avatar_url
                : data.avatarUrl
                || null;

        const baseFirstname =
            data.baseFirstname ===
                undefined
                ? character
                    .base_firstname
                : data.baseFirstname
                    ?.trim()
                || null;

        const baseLastname =
            data.baseLastname ===
                undefined
                ? character
                    .base_lastname
                : data.baseLastname
                    ?.trim()
                || null;

        const existing =
            this.getByProxyName(
                character
                    .owner_user_id,
                proxyName
            );

        if (
            existing
            && existing.id !==
                characterId
        ) {
            throw new Error(
                "Un autre personnage de cette bibliothèque utilise déjà ce nom."
            );
        }

        return repository
            .updateIdentity(
                characterId,
                {
                    proxyName,
                    avatarUrl,
                    baseFirstname,
                    baseLastname,
                    updatedAt:
                        new Date()
                            .toISOString()
                }
            );
    }

    setArchived(
        characterId,
        archived
    ) {
        return repository
            .setArchived(
                characterId,
                archived
                    ? 1
                    : 0,
                new Date()
                    .toISOString()
            );
    }

    delete(
        characterId
    ) {
        return repository
            .deleteCascade(
                this.requireCharacter(
                    characterId
                )
            );
    }

    requireCharacter(
        characterId
    ) {
        const character =
            this.getById(
                characterId
            );

        if (!character) {
            throw new Error(
                "Personnage global introuvable."
            );
        }

        return character;
    }

    normalizeProxyName(
        proxyName
    ) {
        const normalized =
            String(
                proxyName
                || ""
            ).trim();

        if (!normalized) {
            throw new Error(
                "Le nom du personnage est obligatoire."
            );
        }

        return normalized;
    }

}

module.exports =
    new CharacterV2Manager();
