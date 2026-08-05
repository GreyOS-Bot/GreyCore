const InstallationStatus =
    require(
        "../../core/constants/InstallationStatus"
    );

const ValidationPolicy =
    require(
        "../../core/policies/ValidationPolicy"
    );

const InstallationContextService =
    require(
        "../../core/services/InstallationContextService"
    );

const validationRepository =
    require(
        "../../repositories/ValidationRepository"
    );

class ValidationManagerV2 {
    get statuses() {
        return InstallationStatus;
    }

    getInstallation(
        installationId
    ) {
        return validationRepository
            .getInstallationById(
                installationId
            );
    }

    getInstallationContext(
        installationId
    ) {
        return validationRepository
            .getInstallationContext(
                installationId
            );
    }

    requireInstallation(
        installationId
    ) {
        return validationRepository
            .requireInstallation(
                installationId
            );
    }

    assertActorId(
        actorId,
        message
    ) {
        if (
            !actorId ||
            !String(actorId).trim()
        ) {
            throw new Error(message);
        }
    }

    assertReason(
        reason,
        message
    ) {
        if (
            !reason ||
            !String(reason).trim()
        ) {
            throw new Error(message);
        }
    }

    buildContext(
        installationId,
        requester = null,
        guild = null
    ) {
        return InstallationContextService
            .build(
                installationId,
                requester,
                guild
            );
    }

    getContext(
        installationId,
        requester = null,
        guild = null
    ) {
        return this.buildContext(
            installationId,
            requester,
            guild
        );
    }

    getPendingForGuild(
        guildId,
        limit = 25
    ) {
        const safeLimit =
            Math.max(
                1,
                Math.min(
                    Number(limit) || 25,
                    25
                )
            );

        return validationRepository
            .getPendingForGuild(
                guildId,
                safeLimit
            );
    }

    searchIncompleteForGuild(
        guildId,
        filter = ""
    ) {
        return validationRepository
            .searchIncompleteForGuild(
                guildId,
                filter,
                25
            );
    }

    cancelIncompleteInstallation({
        installationId,
        guildId,
        cancelledBy,
        reason
    }) {
        this.assertActorId(
            cancelledBy,
            "Le membre du staff annulant l’installation est obligatoire."
        );
        this.assertReason(
            reason,
            "Le motif de l’annulation est obligatoire."
        );

        const context = this.buildContext(
            installationId
        );

        if (context.installation.guild_id !== guildId) {
            throw new Error(
                "Cette installation appartient à un autre serveur."
            );
        }

        const installation =
            validationRepository
                .cancelIncomplete(
                    installationId,
                    {
                        cancelledBy,
                        reason: String(reason).trim()
                    }
                );

        return {
            action: "cancelled",
            previousStatus:
                context.installation.status,
            installation,
            context
        };
    }

    getHistory(
        installationId,
        limit = 20
    ) {
        this.requireInstallation(
            installationId
        );

        const safeLimit =
            Math.max(
                1,
                Math.min(
                    Number(limit) || 20,
                    25
                )
            );

        return validationRepository
            .getHistory(
                installationId,
                safeLimit
            );
    }

    submitInstallation({
        installationId,
        submittedBy
    }) {
        this.assertActorId(
            submittedBy,
            "L’utilisateur envoyant la demande est obligatoire."
        );

        const context =
            this.buildContext(
                installationId
            );

        const installation =
            context.installation;

        if (
            !ValidationPolicy.canSubmit(
                context
            )
        ) {
            throw new Error(
                "Cette installation ne peut pas être envoyée en validation."
            );
        }

        const updatedInstallation =
            validationRepository.submit(
                installationId,
                {
                    submittedBy
                }
            );

        return {
            action:
                "submitted",

            previousStatus:
                installation.status,

            installation:
                updatedInstallation
        };
    }

    cancelSubmission({
        installationId
    }) {

        return validationRepository
            .cancelSubmission(
                installationId
            );

    }

    approveInstallation({
        installationId,
        approvedBy
    }) {
        this.assertActorId(
            approvedBy,
            "Le membre du staff validant la demande est obligatoire."
        );

        const context =
            this.buildContext(
                installationId
            );

        const installation =
            context.installation;

        if (
            !ValidationPolicy.canApprove(
                context
            )
        ) {
            throw new Error(
                "Cette installation ne peut pas être validée."
            );
        }

        const approvedBefore =
            validationRepository
                .countApprovedInstallationsForCharacterOnGuild(
                    installation.character_id,
                    installation.guild_id
                );

        const updatedInstallation =
            validationRepository.approve(
                installationId,
                {
                    approvedBy
                }
            );

        return {
            action:
                "approved",

            previousStatus:
                installation.status,

            isFirstApprovedInstallation:
                approvedBefore === 0,

            installation:
                updatedInstallation
        };
    }

    rejectInstallation({
        installationId,
        rejectedBy,
        reason
    }) {
        this.assertActorId(
            rejectedBy,
            "Le membre du staff refusant la demande est obligatoire."
        );

        this.assertReason(
            reason,
            "Le motif du refus est obligatoire."
        );

        const context =
            this.buildContext(
                installationId
            );

        const installation =
            context.installation;

        if (
            !ValidationPolicy.canReject(
                context
            )
        ) {
            throw new Error(
                "Cette installation ne peut pas être refusée."
            );
        }

        const updatedInstallation =
            validationRepository.reject(
                installationId,
                {
                    rejectedBy,

                    reason:
                        String(
                            reason
                        ).trim()
                }
            );

        return {
            action:
                "rejected",

            previousStatus:
                installation.status,

            installation:
                updatedInstallation
        };
    }

    suspendInstallation({
        installationId,
        suspendedBy,
        reason
    }) {
        this.assertActorId(
            suspendedBy,
            "Le membre du staff suspendant l’installation est obligatoire."
        );

        this.assertReason(
            reason,
            "Le motif de la suspension est obligatoire."
        );

        const context =
            this.buildContext(
                installationId
            );

        const installation =
            context.installation;

        if (
            !ValidationPolicy.canSuspend(
                context
            )
        ) {
            throw new Error(
                "Cette installation ne peut pas être suspendue."
            );
        }

        const updatedInstallation =
            validationRepository.suspend(
                installationId,
                {
                    suspendedBy,

                    reason:
                        String(
                            reason
                        ).trim()
                }
            );

        return {
            action:
                "suspended",

            previousStatus:
                installation.status,

            installation:
                updatedInstallation
        };
    }

    reopenInstallation({
        installationId
    }) {
        const context =
            this.buildContext(
                installationId
            );

        const installation =
            context.installation;

        if (
            !ValidationPolicy.canReopen(
                context
            )
        ) {
            throw new Error(
                "Cette installation ne peut pas être replacée en brouillon."
            );
        }

        const updatedInstallation =
            validationRepository.reopen(
                installationId
            );

        return {
            action:
                "reopened",

            previousStatus:
                installation.status,

            installation:
                updatedInstallation
        };
    }

    archiveInstallation({
        installationId
    }) {
        const context =
            this.buildContext(
                installationId
            );

        const installation =
            context.installation;

        if (
            !ValidationPolicy.canArchive(
                context
            )
        ) {
            throw new Error(
                "Cette installation est déjà archivée."
            );
        }

        const updatedInstallation =
            validationRepository.archive(
                installationId
            );

        return {
            action:
                "archived",

            previousStatus:
                installation.status,

            installation:
                updatedInstallation
        };
    }

    storeValidationMessage({
        installationId,
        channelId,
        messageId
    }) {
        this.assertActorId(
            channelId,
            "Le salon de validation est obligatoire."
        );

        this.assertActorId(
            messageId,
            "Le message de validation est obligatoire."
        );

        return validationRepository
            .storeValidationMessage(
                installationId,
                {
                    channelId,
                    messageId
                }
            );
    }

    clearValidationMessage({
        installationId
    }) {
        return validationRepository
            .clearValidationMessage(
                installationId
            );
    }

    isProxyAvailable(
        installationId
    ) {
        const installation =
            this.requireInstallation(
                installationId
            );

        return (
            installation.status ===
                InstallationStatus.APPROVED &&
            Boolean(
                installation.proxy_enabled
            )
        );
    }
}

module.exports =
    new ValidationManagerV2();
