const repository =
    require("../repositories/AssetRepository");

const typeManager =
    require("./AssetTypeV2Manager");

class AssetV2Manager {

    getById(assetId) {
        return repository.getById(assetId);
    }

    getForContinuity(guildId, continuityId) {
        return repository.getForContinuity(guildId, continuityId);
    }

    countForContinuity(guildId, continuityId) {
        return repository.countForContinuity(guildId, continuityId);
    }

    getTransfers(assetId) {
        return repository.getTransfers(assetId);
    }

    create(data) {
        const type = typeManager.getById(data.assetTypeId);

        if (
            !type
            || String(type.guild_id) !== String(data.guildId)
            || Number(type.is_archived) === 1
        ) {
            throw new Error("Ce type de bien n’est pas disponible.");
        }

        if (!repository.getContinuityForGuild(
            data.guildId,
            data.continuityId
        )) {
            throw new Error("Cette continuité n’est pas jouable sur ce serveur.");
        }

        const now = new Date().toISOString();

        return repository.create({
            guildId: data.guildId,
            continuityId: data.continuityId,
            assetTypeId: type.id,
            name: this.normalizeRequired(data.name, "Le nom du bien est obligatoire."),
            description: this.normalizeOptional(data.description, 1_500),
            details: this.normalizeOptional(data.details, 1_500),
            imageUrl: this.normalizeUrl(data.imageUrl),
            createdBy: String(data.createdBy || "").trim(),
            createdAt: now,
            updatedAt: now
        });
    }

    update(assetId, data) {
        const asset = this.requireAsset(assetId);

        return repository.update(asset.id, {
            name: data.name === undefined
                ? asset.name
                : this.normalizeRequired(data.name, "Le nom du bien est obligatoire."),
            description: data.description === undefined
                ? asset.description
                : this.normalizeOptional(data.description, 1_500),
            details: data.details === undefined
                ? asset.details
                : this.normalizeOptional(data.details, 1_500),
            imageUrl: data.imageUrl === undefined
                ? asset.image_url
                : this.normalizeUrl(data.imageUrl),
            updatedAt: new Date().toISOString()
        });
    }

    transfer(assetId, data) {
        const asset = this.requireAsset(assetId);
        const expectedContinuityId =
            data.expectedContinuityId === undefined
                ? asset.continuity_id
                : data.expectedContinuityId;
        const target = repository.getContinuityForGuild(
            asset.guild_id,
            data.toContinuityId
        );

        if (!target) {
            throw new Error("Le personnage choisi n’est pas jouable sur ce serveur.");
        }

        if (target.id === asset.continuity_id) {
            throw new Error("Ce bien appartient déjà à ce personnage.");
        }

        return repository.transfer(asset, {
            toContinuityId: target.id,
            expectedContinuityId,
            transferredBy: String(data.transferredBy || "").trim(),
            note: this.normalizeOptional(data.note, 500),
            createdAt: new Date().toISOString()
        });
    }

    delete(assetId) {
        const asset = this.requireAsset(assetId);

        repository.delete(asset.id);

        return asset;
    }

    requireAsset(assetId) {
        const asset = this.getById(assetId);

        if (!asset) {
            throw new Error("Bien introuvable.");
        }

        return asset;
    }

    normalizeRequired(value, message) {
        const text = String(value || "").trim();

        if (!text) {
            throw new Error(message);
        }

        if (text.length > 100) {
            throw new Error("Le nom du bien est trop long.");
        }

        return text;
    }

    normalizeOptional(value, maximumLength) {
        const text = String(value || "").trim();

        if (text.length > maximumLength) {
            throw new Error("Ce champ est trop long.");
        }

        return text || null;
    }

    normalizeUrl(value) {
        const url = String(value || "").trim();

        if (!url) {
            return null;
        }

        try {
            const parsed = new URL(url);

            if (!["http:", "https:"].includes(parsed.protocol)) {
                throw new Error("invalid protocol");
            }
        } catch {
            throw new Error("Le lien de l’image est invalide.");
        }

        return url;
    }
}

module.exports =
    new AssetV2Manager();
