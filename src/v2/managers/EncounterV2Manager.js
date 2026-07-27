const repository =
    require(
        "../repositories/EncounterRepository"
    );

class EncounterV2Manager {

    getById(
        encounterId
    ) {
        return repository
            .getById(
                encounterId
            );
    }

    getForContinuity(
        continuityId
    ) {
        return repository
            .getForContinuity(
                continuityId
            );
    }

    create(
        data
    ) {
        const continuityAId =
            String(
                data.continuityAId
                || ""
            ).trim();

        const continuityBId =
            String(
                data.continuityBId
                || ""
            ).trim()
            || null;

        const externalName =
            String(
                data.externalName
                || ""
            ).trim()
            || null;

        if (!continuityAId) {
            throw new Error(
                "Continuité principale introuvable."
            );
        }

        if (
            continuityBId
            && continuityAId ===
                continuityBId
        ) {
            throw new Error(
                "Une continuité ne peut pas se rencontrer elle-même."
            );
        }

        if (
            !continuityBId
            && !externalName
        ) {
            throw new Error(
                "Le personnage rencontré est obligatoire."
            );
        }

        this.requireContinuity(
            continuityAId,
            "Continuité principale introuvable."
        );

        if (continuityBId) {
            this.requireContinuity(
                continuityBId,
                "Continuité rencontrée introuvable."
            );
        }

        const createdBy =
            String(
                data.createdBy
                || ""
            ).trim();

        if (!createdBy) {
            throw new Error(
                "Le créateur de la rencontre est obligatoire."
            );
        }

        const now =
            new Date()
                .toISOString();

        return repository.insert({
            continuityAId,
            continuityBId,
            externalName:
                continuityBId
                    ? null
                    : externalName,
            location:
                this.normalizeOptionalText(
                    data.location
                ),
            note:
                this.normalizeOptionalText(
                    data.note
                ),
            occurredAt:
                this.normalizeDate(
                    data.occurredAt,
                    now.slice(
                        0,
                        10
                    )
                ),
            createdBy,
            createdAt:
                now,
            updatedAt:
                now
        });
    }

    update(
        encounterId,
        data
    ) {
        const encounter =
            this.requireEncounter(
                encounterId
            );

        const externalName =
            data.externalName ===
                undefined
                ? encounter
                    .external_name
                : this.normalizeOptionalText(
                    data.externalName
                );

        if (
            !encounter
                .continuity_b_id
            && !externalName
        ) {
            throw new Error(
                "Le personnage rencontré est obligatoire."
            );
        }

        return repository.update(
            encounterId,
            {
                externalName,
                location:
                    data.location ===
                        undefined
                        ? encounter.location
                        : this
                            .normalizeOptionalText(
                                data.location
                            ),
                note:
                    data.note ===
                        undefined
                        ? encounter.note
                        : this
                            .normalizeOptionalText(
                                data.note
                            ),
                occurredAt:
                    this.normalizeDate(
                        data.occurredAt,
                        encounter
                            .occurred_at
                    ),
                updatedAt:
                    new Date()
                        .toISOString()
            }
        );
    }

    delete(
        encounterId
    ) {
        const encounter =
            this.requireEncounter(
                encounterId
            );

        repository.delete(
            encounterId
        );

        return encounter;
    }

    requireEncounter(
        encounterId
    ) {
        const encounter =
            this.getById(
                encounterId
            );

        if (!encounter) {
            throw new Error(
                "Rencontre introuvable."
            );
        }

        return encounter;
    }

    requireContinuity(
        continuityId,
        errorMessage
    ) {
        const continuity =
            repository
                .getContinuityById(
                    continuityId
                );

        if (!continuity) {
            throw new Error(
                errorMessage
            );
        }

        return continuity;
    }

    normalizeOptionalText(
        value
    ) {
        return String(
            value
            || ""
        ).trim()
        || null;
    }

    normalizeDate(
        value,
        fallback
    ) {
        if (!value) {
            return fallback;
        }

        const normalized =
            String(value)
                .trim();

        if (
            !/^\d{4}-\d{2}-\d{2}$/
                .test(
                    normalized
                )
        ) {
            throw new Error(
                "La date doit respecter le format AAAA-MM-JJ."
            );
        }

        const parsed =
            new Date(
                `${normalized}T00:00:00.000Z`
            );

        if (
            Number.isNaN(
                parsed.getTime()
            )
            || parsed
                .toISOString()
                .slice(
                    0,
                    10
                ) !== normalized
        ) {
            throw new Error(
                "La date de la rencontre est invalide."
            );
        }

        return normalized;
    }

}

module.exports =
    new EncounterV2Manager();
