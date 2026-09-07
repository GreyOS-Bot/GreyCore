const InstallationStatus =
    require(
        "../core/constants/InstallationStatus"
    );

const repository =
    require(
        "../repositories/InstallationRepository"
    );

const ALLOWED_STATUSES =
    Object.freeze(
        Object.values(
            InstallationStatus
        )
    );

class InstallationV2Manager {

    resolveContext(guildId, contextId = null) {
        if (!repository.supportsContexts()) return null;
        const ContextRepository = require("../repositories/ContextRepository");
        const ContextService = require("../services/contexts/ContextService");
        const ContextResolutionService = require("../services/contexts/ContextResolutionService");
        const contexts = new ContextService(new ContextRepository());
        return new ContextResolutionService(contexts).resolve({
            guildId: String(guildId), contextId
        });
    }

    getById(
        installationId
    ) {
        return repository
            .getById(
                installationId
            );
    }

    getByContinuityAndGuild(
        continuityId,
        guildId
    ) {
        return repository
            .getByContinuityAndGuild(
                continuityId,
                guildId
            );
    }

    getAnyByContinuityAndGuild(
        continuityId,
        guildId
    ) {
        return repository
            .getAnyByContinuityAndGuild(
                continuityId,
                guildId
            );
    }

    getByContinuity(
        continuityId
    ) {
        return repository
            .getByContinuity(
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

    getByGuild(
        guildId
    ) {
        return repository
            .getByGuild(
                guildId
            );
    }

    getByGuildAndContext(guildId, contextId) {
        const context = this.resolveContext(guildId, contextId);
        return repository.getByGuildAndContext(String(guildId), context.id);
    }

    getByContinuityGuildAndContext(continuityId, guildId, contextId) {
        const context = this.resolveContext(guildId, contextId);
        return repository.getByContinuityGuildAndContext(continuityId, String(guildId), context.id);
    }

    requireInContext(installationId, guildId, contextId) {
        const installation = this.requireInstallation(installationId);
        const context = this.resolveContext(guildId, contextId);
        if (installation.guild_id !== String(guildId) || installation.context_id !== context.id) {
            throw new Error("Installation introuvable dans ce Context.");
        }
        return installation;
    }

    requireInGuild(installationId, guildId) {
        const installation = this.requireInstallation(installationId);
        if (installation.guild_id !== String(guildId)) {
            throw new Error("Cette installation appartient à une autre Guild.");
        }
        return installation;
    }

    requireInstallationInSceneContext(installationId, scene) {
        if (!scene?.guild_id || !scene?.context_id) {
            throw new Error("La Scene ne possède pas de Context exact.");
        }
        return this.requireInContext(installationId, scene.guild_id, scene.context_id);
    }

    requireInstallationForGreyFate(installationId, operation, scene = null) {
        if (!operation?.guild_id || !operation?.context_id) {
            throw new Error("L’opération GreyFate ne possède pas de Context exact.");
        }
        const installation = this.requireInContext(
            installationId, operation.guild_id, operation.context_id
        );
        if (scene && (scene.guild_id !== operation.guild_id || scene.context_id !== operation.context_id)) {
            throw new Error("GreyFate, Scene et Installation appartiennent à des Contexts différents.");
        }
        return installation;
    }

    getPlayableCharactersForGuild(
        guildId
    ) {
        const normalizedGuildId = String(
            guildId || ""
        ).trim();

        if (!normalizedGuildId) {
            throw new Error(
                "Le serveur est obligatoire."
            );
        }

        return repository
            .getPlayableCharactersForGuild(
                normalizedGuildId
            );
    }

    getPlayableCharactersForGuildAndContext(guildId, contextId) {
        const normalizedGuildId = String(guildId || "").trim();
        if (!normalizedGuildId) throw new Error("Le serveur est obligatoire.");
        const context = this.resolveContext(normalizedGuildId, contextId);
        return repository.getPlayableCharactersForGuildAndContext(normalizedGuildId, context.id);
    }

    create(
        data
    ) {
        const context = this.resolveContext(data.guildId, data.contextId ?? null);
        const existing =
            this.getAnyByContinuityAndGuild(
                data.continuityId,
                data.guildId
            );

        if (
            existing
            && existing.status !==
                InstallationStatus.ARCHIVED
        ) {
            throw new Error(
                "Cette histoire est déjà installée sur ce serveur."
            );
        }

        if (existing) {
            repository.delete(existing.id);
        }

        const now =
            new Date()
                .toISOString();

        return repository.insert({
            characterId:
                data.characterId,
            continuityId:
                data.continuityId,
            guildId:
                data.guildId,
            contextId:
                context?.id || null,
            status:
                data.status
                || InstallationStatus.DRAFT,
            visibility:
                data.visibility
                || "private",
            proxyEnabled:
                data.proxyEnabled
                    ? 1
                    : 0,
            localAvatarUrl:
                data.localAvatarUrl
                || null,
            validatedBy:
                data.validatedBy
                || null,
            validatedAt:
                data.validatedAt
                || null,
            rejectionReason:
                data.rejectionReason
                || null,
            installedAt:
                data.installedAt
                || now,
            updatedAt:
                data.updatedAt
                || now,
            lastActivityAt:
                data.lastActivityAt
                || null
        });
    }

    createDraft({
        continuityId,
        guildId,
        contextId = null,
        visibility = "private"
    }) {
        const context = this.resolveContext(guildId, contextId);
        const existing =
            this.getAnyByContinuityAndGuild(
                continuityId,
                guildId
            );

        if (
            existing
            && existing.status !==
                InstallationStatus.ARCHIVED
        ) {
            if (contextId !== null && existing.context_id && existing.context_id !== context.id) {
                throw new Error("Cette histoire est déjà installée dans un autre Context de cette Guild.");
            }
            return existing;
        }

        if (existing) {
            repository.delete(existing.id);
        }

        const continuity =
            repository
                .getContinuityById(
                    continuityId
                );

        if (!continuity) {
            throw new Error(
                "Histoire introuvable."
            );
        }

        return repository
            .insertDraft({
                characterId:
                    continuity
                        .character_id,
                continuityId:
                    continuity.id,
                guildId,
                contextId:
                    context?.id || null,
                visibility,
                createdAt:
                    new Date()
                        .toISOString()
            });
    }

    updateStatus(
        installationId,
        data
    ) {
        this.requireInstallation(
            installationId
        );

        this.requireStatus(
            data.status
        );

        return repository
            .updateStatus(
                installationId,
                {
                    status:
                        data.status,
                    proxyEnabled:
                        data.proxyEnabled
                            ? 1
                            : 0,
                    validatedBy:
                        data.validatedBy
                        || null,
                    validatedAt:
                        data.validatedAt
                        || null,
                    rejectionReason:
                        data.rejectionReason
                        || null,
                    updatedAt:
                        new Date()
                            .toISOString()
                }
            );
    }

    setStatus(
        installationId,
        status
    ) {
        this.requireStatus(
            status
        );

        this.requireInstallation(
            installationId
        );

        return repository
            .setStatus(
                installationId,
                status,
                new Date()
                    .toISOString()
            );
    }

    setVisibility(
        installationId,
        visibility
    ) {
        this.requireInstallation(
            installationId
        );

        return repository
            .setVisibility(
                installationId,
                visibility,
                new Date()
                    .toISOString()
            );
    }

    touchActivity(
        installationId
    ) {
        this.requireInstallation(
            installationId
        );

        return repository
            .touchActivity(
                installationId,
                new Date()
                    .toISOString()
            );
    }

    setLocalAvatar(
        installationId,
        avatarUrl
    ) {
        this.requireInstallation(
            installationId
        );

        repository
            .setLocalAvatar(
                installationId,
                avatarUrl
                    ?.trim()
                || null,
                new Date()
                    .toISOString()
            );

        this.handleInstallationUpdated(
            installationId
        );

        return this.getById(
            installationId
        );
    }

    removeLocalAvatar(
        installationId
    ) {
        return this.setLocalAvatar(
            installationId,
            null
        );
    }

    getEffectiveAvatar(
        installationId
    ) {
        return repository
            .getEffectiveAvatar(
                installationId
            );
    }

    delete(
        installationId
    ) {
        const installation =
            this.requireInstallation(
                installationId
            );

        repository.delete(
            installationId
        );

        return installation;
    }

    resetRejectedInstallation(
        installationId
    ) {
        const installation =
            this.requireInstallation(
                installationId
            );

        if (
            installation.status !==
            InstallationStatus.REJECTED
        ) {
            return installation;
        }

        return repository
            .resetRejected(
                installationId,
                new Date()
                    .toISOString()
            );
    }

    handleInstallationUpdated(
        installationId
    ) {
        return this
            .resetRejectedInstallation(
                installationId
            );
    }

    handleContinuityUpdated(
        continuityId
    ) {
        const installations =
            this.getByContinuity(
                continuityId
            );

        const rejectedInstallationIds =
            installations
                .filter(
                    installation =>
                        installation.status ===
                        InstallationStatus.REJECTED
                )
                .map(
                    installation =>
                        installation.id
                );

        repository
            .resetRejectedMany(
                rejectedInstallationIds,
                new Date()
                    .toISOString()
            );

        return {
            total:
                installations.length,
            reset:
                rejectedInstallationIds
                    .length,
            installations:
                this.getByContinuity(
                    continuityId
                )
        };
    }

    requireInstallation(
        installationId
    ) {
        const installation =
            this.getById(
                installationId
            );

        if (!installation) {
            throw new Error(
                "Installation introuvable."
            );
        }

        return installation;
    }

    requireStatus(
        status
    ) {
        if (
            !ALLOWED_STATUSES
                .includes(
                    status
                )
        ) {
            throw new Error(
                "Statut d’installation invalide."
            );
        }
    }

}

module.exports =
    new InstallationV2Manager();
