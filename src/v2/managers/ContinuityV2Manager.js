const crypto =
    require("crypto");

const repository =
    require(
        "../repositories/ContinuityRepository"
    );

const installationV2Manager =
    require(
        "./InstallationV2Manager"
    );

class ContinuityV2Manager {

    generateId() {
        return (
            `cont_${crypto.randomUUID()}`
        );
    }

    getById(
        continuityId
    ) {
        return repository
            .getById(
                continuityId
            );
    }

    getByCharacter(
        characterId
    ) {
        return repository
            .getByCharacter(
                characterId
            );
    }

    getByCharacterAndName(
        characterId,
        name
    ) {
        return repository
            .getByCharacterAndName(
                characterId,
                String(
                    name
                    || ""
                ).trim()
            );
    }

    create(
        data
    ) {
        const name =
            this.normalizeName(
                data.name
            );

        const existing =
            this.getByCharacterAndName(
                data.characterId,
                name
            );

        if (existing) {
            throw new Error(
                "Une continuité portant ce nom existe déjà pour ce personnage."
            );
        }

        const now =
            new Date()
                .toISOString();

        return repository.insert({
            id:
                data.id
                || this.generateId(),
            characterId:
                data.characterId,
            name,
            mode:
                data.mode
                || "original",
            sourceContinuityId:
                data.sourceContinuityId
                || null,
            firstname:
                data.firstname
                    ?.trim()
                || null,
            lastname:
                data.lastname
                    ?.trim()
                || null,
            age:
                data.age
                ?? null,
            gang:
                data.gang
                    ?.trim()
                || null,
            story:
                data.story
                    ?.trim()
                || null,
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

    updateProfile(
        continuityId,
        data
    ) {
        const continuity =
            this.requireContinuity(
                continuityId
            );

        const normalized =
            this.normalizeProfileUpdate(
                continuity,
                data
            );

        const existing =
            this.getByCharacterAndName(
                continuity
                    .character_id,
                normalized.name
            );

        if (
            existing
            && existing.id !==
                continuityId
        ) {
            throw new Error(
                "Une autre continuité utilise déjà ce nom."
            );
        }

        if (
            !this.hasProfileChanged(
                continuity,
                normalized
            )
        ) {
            return continuity;
        }

        const updated =
            repository
                .updateProfile(
                    continuityId,
                    {
                        ...normalized,
                        updatedAt:
                            new Date()
                                .toISOString()
                    }
                );

        installationV2Manager
            .handleContinuityUpdated(
                continuityId
            );

        return updated;
    }

    setArchived(
        continuityId,
        archived
    ) {
        this.requireContinuity(
            continuityId
        );

        return repository
            .setArchived(
                continuityId,
                archived
                    ? 1
                    : 0,
                new Date()
                    .toISOString()
            );
    }

    delete(
        continuityId
    ) {
        return repository
            .deleteCascade(
                this.requireContinuity(
                    continuityId
                )
            );
    }

    requireContinuity(
        continuityId
    ) {
        const continuity =
            this.getById(
                continuityId
            );

        if (!continuity) {
            throw new Error(
                "Continuité introuvable."
            );
        }

        return continuity;
    }

    normalizeName(
        name
    ) {
        const normalized =
            String(
                name
                || ""
            ).trim();

        if (!normalized) {
            throw new Error(
                "Le nom de la continuité est obligatoire."
            );
        }

        return normalized;
    }

    normalizeProfileUpdate(
        continuity,
        data
    ) {
        return {
            name:
                data.name ===
                    undefined
                    ? continuity.name
                    : this.normalizeName(
                        data.name
                    ),
            firstname:
                data.firstname ===
                    undefined
                    ? continuity
                        .firstname
                    : data.firstname
                        ?.trim()
                    || null,
            lastname:
                data.lastname ===
                    undefined
                    ? continuity
                        .lastname
                    : data.lastname
                        ?.trim()
                    || null,
            age:
                data.age ===
                    undefined
                    ? continuity.age
                    : data.age,
            gang:
                data.gang ===
                    undefined
                    ? continuity.gang
                    : data.gang
                        ?.trim()
                    || null,
            story:
                data.story ===
                    undefined
                    ? continuity.story
                    : data.story
                        ?.trim()
                    || null
        };
    }

    hasProfileChanged(
        continuity,
        profile
    ) {
        return (
            profile.name !==
                continuity.name
            || profile.firstname !==
                continuity.firstname
            || profile.lastname !==
                continuity.lastname
            || String(
                profile.age
                ?? ""
            ) !== String(
                continuity.age
                ?? ""
            )
            || profile.gang !==
                continuity.gang
            || profile.story !==
                continuity.story
        );
    }

}

module.exports =
    new ContinuityV2Manager();
