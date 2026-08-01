const repository =
    require(
        "../repositories/OutfitRepository"
    );

class OutfitV2Manager {

    getById(
        outfitId
    ) {
        return repository
            .getById(
                outfitId
            );
    }

    getCurrent(
        continuityId
    ) {
        return repository
            .getCurrent(
                continuityId
            );
    }

    getForContinuity(
        continuityId,
        limit = 25
    ) {
        return repository
            .getForContinuity(
                continuityId,
                this.normalizeLimit(
                    limit,
                    25
                )
            );
    }

    getHistory(
        continuityId,
        limit = 20
    ) {
        return repository
            .getHistory(
                continuityId,
                this.normalizeLimit(
                    limit,
                    20
                )
            );
    }

    createCurrent(
        data
    ) {
        const imageUrl =
            String(
                data.imageUrl
                || ""
            ).trim();

        if (!imageUrl) {
            throw new Error(
                "L’image de la tenue est obligatoire."
            );
        }

        if (
            !repository
                .getContinuityById(
                    data.continuityId
                )
        ) {
            throw new Error(
                "Continuité introuvable."
            );
        }

        const now =
            new Date()
                .toISOString();

        return repository
            .createCurrent({
                continuityId:
                    data.continuityId,
                imageUrl,
                imageData:
                    this.normalizeImageData(
                        data.imageData
                    ),
                imageFilename:
                    this.normalizeText(
                        data.imageFilename
                    ),
                imageContentType:
                    this.normalizeText(
                        data.imageContentType
                    ),
                title:
                    this.normalizeText(
                        data.title
                    ),
                description:
                    this.normalizeText(
                        data.description
                    ),
                createdAt:
                    data.createdAt
                    || now,
                updatedAt:
                    data.updatedAt
                    || now
            });
    }

    updateDetails(
        outfitId,
        data
    ) {
        const outfit =
            this.requireOutfit(
                outfitId
            );

        return repository
            .updateDetails(
                outfitId,
                {
                    title:
                        data.title ===
                            undefined
                            ? outfit.title
                            : this
                                .normalizeText(
                                    data.title
                                ),
                    description:
                        data.description ===
                            undefined
                            ? outfit
                                .description
                            : this
                                .normalizeText(
                                    data.description
                                ),
                    updatedAt:
                        new Date()
                            .toISOString()
                }
            );
    }

    setCurrent(
        outfitId
    ) {
        return repository
            .setCurrent(
                this.requireOutfit(
                    outfitId
                ),
                new Date()
                    .toISOString()
            );
    }

    delete(
        outfitId
    ) {
        const outfit =
            this.requireOutfit(
                outfitId
            );

        repository.delete(
            outfitId
        );

        return outfit;
    }

    requireOutfit(
        outfitId
    ) {
        const outfit =
            this.getById(
                outfitId
            );

        if (!outfit) {
            throw new Error(
                "Tenue introuvable."
            );
        }

        return outfit;
    }

    normalizeText(
        value
    ) {
        return String(
            value
            || ""
        ).trim()
        || null;
    }

    normalizeImageData(value) {
        if (!value) {
            return null;
        }

        if (!Buffer.isBuffer(value)) {
            throw new Error(
                "L'image de la tenue est invalide."
            );
        }

        return value;
    }

    normalizeLimit(
        limit,
        fallback
    ) {
        const numeric =
            Number(
                limit
            );

        if (
            !Number.isInteger(
                numeric
            )
            || numeric < 0
        ) {
            return fallback;
        }

        return Math.min(
            numeric,
            100
        );
    }

}

module.exports =
    new OutfitV2Manager();
