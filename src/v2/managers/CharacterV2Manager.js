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
