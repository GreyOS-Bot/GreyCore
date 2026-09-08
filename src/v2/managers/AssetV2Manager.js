const repository =
    require("../repositories/InstallationAssetRepository");

const typeManager =
    require("./AssetTypeV2Manager");

class AssetV2Manager {

    getById(assetId) {
        return repository.getById(assetId);
    }

    getForContinuity(guildId, continuityId) {
        const candidates = repository.getCandidates(guildId, continuityId);
        return candidates.length === 1
            ? repository.getForInstallation(candidates[0].id, candidates[0].context_id)
            : [];
    }

    countForContinuity(guildId, continuityId) {
        return this.getForContinuity(guildId, continuityId).length;
    }

    getForInstallationInContext(installationId, guildId, contextId) {
        const installation = this.requireInstallation(
            installationId,
            guildId,
            contextId,
            false
        );

        return repository.getForInstallation(
            installation.id,
            installation.context_id
        );
    }

    countForInstallationInContext(installationId, guildId, contextId) {
        this.requireInstallation(installationId, guildId, contextId, false);
        return repository.countForInstallation(installationId, contextId);
    }

    getTransfers(assetId, scope = {}) {
        this.requireAssetScope(this.requireAsset(assetId), scope, false);
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

        const installation = this.resolveInstallation(data, true);

        const now = new Date().toISOString();

        return repository.create({
            guildId: data.guildId,
            contextId: installation.context_id,
            installationId: installation.id,
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

    update(assetId, data, scope = {}) {
        const asset = this.requireAsset(assetId);
        this.requireAssetScope(asset, scope, true);

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
        this.requireAssetScope(asset, data, true);
        const expectedInstallationId = data.expectedInstallationId === undefined
            ? data.expectedContinuityId === undefined
                ? asset.installation_id
                : String(data.expectedContinuityId) === String(asset.continuity_id)
                    ? asset.installation_id
                    : -1
            : Number(data.expectedInstallationId);
        const target = this.resolveInstallation({
            guildId: asset.guild_id,
            contextId: asset.context_id,
            installationId: data.toInstallationId,
            continuityId: data.toContinuityId
        }, true);

        if (!target) {
            throw new Error("Le personnage choisi n’est pas jouable sur ce serveur.");
        }

        if (target.id === asset.installation_id) {
            throw new Error("Ce bien appartient déjà à ce personnage.");
        }

        return repository.transfer(asset, {
            toInstallationId: target.id,
            expectedInstallationId,
            transferredBy: String(data.transferredBy || "").trim(),
            note: this.normalizeOptional(data.note, 500),
            createdAt: new Date().toISOString()
        });
    }

    delete(assetId, scope = {}) {
        const asset = this.requireAsset(assetId);
        this.requireAssetScope(asset, scope, true);

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

    requireAssetScope(asset, scope = {}, write = false) {
        if (
            scope.guildId
            && String(asset.guild_id) !== String(scope.guildId)
            || scope.contextId
            && asset.context_id !== scope.contextId
        ) {
            throw new Error("Bien introuvable dans ce Context.");
        }

        if (write && !asset.context_is_active) {
            throw new Error("Ce Context est inactif.");
        }

        return asset;
    }

    requireInstallation(installationId, guildId, contextId, write = true) {
        const installation = repository.getInstallation(installationId);

        if (
            !installation
            || String(installation.guild_id) !== String(guildId)
            || contextId && installation.context_id !== contextId
            || installation.status !== "approved"
            || Number(installation.is_archived) === 1
            || write && !installation.context_is_active
        ) {
            throw new Error("Cette Installation n’est pas disponible dans ce Context.");
        }

        return installation;
    }

    resolveInstallation(data, write = true) {
        if (data.installationId) {
            return this.requireInstallation(
                data.installationId,
                data.guildId,
                data.contextId,
                write
            );
        }

        const candidates = repository.getCandidates(
            data.guildId,
            data.continuityId,
            data.contextId || null
        );

        if (candidates.length !== 1) {
            throw new Error("La Continuity ne détermine pas une Installation unique dans ce Context.");
        }

        return this.requireInstallation(
            candidates[0].id,
            data.guildId,
            data.contextId,
            write
        );
    }

    getLegacyAssets(guildId) {
        return repository.getLegacyAssets(guildId);
    }

    getLegacyTransfers(guildId) {
        return repository.getLegacyTransfers(guildId);
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
