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

    create(
        data
    ) {
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
        visibility = "private"
    }) {
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
