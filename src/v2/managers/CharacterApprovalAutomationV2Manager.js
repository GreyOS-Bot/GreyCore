const repository =
    require(
        "../repositories/CharacterApprovalAutomationRepository"
    );

class CharacterApprovalAutomationV2Manager {

    getConfiguration(guildId) {
        return repository.getConfiguration(
            guildId
        );
    }

    configure({
        guildId,
        approvedCharacterCount = 2,
        requiredRoleId,
        removeRoleId,
        addRoleId,
        welcomeChannelId,
        welcomeMessage
    }) {
        this.assertConfiguration({
            approvedCharacterCount,
            requiredRoleId,
            removeRoleId,
            addRoleId,
            welcomeChannelId,
            welcomeMessage
        });

        return repository.saveConfiguration({
            guildId,
            approvedCharacterCount,
            requiredRoleId,
            removeRoleId,
            addRoleId,
            welcomeChannelId,
            welcomeMessage:
                String(welcomeMessage).trim(),
            updatedAt:
                new Date().toISOString()
        });
    }

    disable(guildId) {
        return repository.disable(
            guildId,
            new Date().toISOString()
        );
    }

    countApprovedCharacters(
        guildId,
        discordUserId
    ) {
        return repository.countApprovedCharacters(
            guildId,
            discordUserId
        );
    }

    getRun(guildId, discordUserId) {
        return repository.getRun(
            guildId,
            discordUserId
        );
    }

    claimRun({
        guildId,
        discordUserId,
        approvedCharacterCount
    }) {
        return repository.claimRun({
            guildId,
            discordUserId,
            approvedCharacterCount,
            claimedAt:
                new Date().toISOString()
        });
    }

    completeRun({
        guildId,
        discordUserId
    }) {
        return repository.completeRun({
            guildId,
            discordUserId,
            completedAt:
                new Date().toISOString()
        });
    }

    releaseRun(guildId, discordUserId) {
        return repository.releaseRun(
            guildId,
            discordUserId
        );
    }

    assertConfiguration({
        approvedCharacterCount,
        requiredRoleId,
        removeRoleId,
        addRoleId,
        welcomeChannelId,
        welcomeMessage
    }) {
        if (
            !Number.isInteger(approvedCharacterCount)
            || approvedCharacterCount < 1
        ) {
            throw new Error(
                "Le nombre de personnages validés doit être au moins égal à 1."
            );
        }

        const hasWelcomeChannel = Boolean(
            String(welcomeChannelId || "").trim()
        );
        const message = String(
            welcomeMessage || ""
        ).trim();
        const hasWelcomeMessage = Boolean(message);
        const hasAddRole = Boolean(
            String(addRoleId || "").trim()
        );

        if (hasWelcomeChannel !== hasWelcomeMessage) {
            throw new Error(
                "Le salon et le message de bienvenue doivent être renseignés ensemble."
            );
        }

        if (
            !String(removeRoleId || "").trim()
            && !String(addRoleId || "").trim()
            && !hasWelcomeChannel
        ) {
            throw new Error(
                "Configure au moins une action : retirer un rôle, ajouter un rôle ou envoyer un message."
            );
        }

        if (
            hasAddRole
            &&
            (
                String(requiredRoleId) === String(addRoleId)
                || String(removeRoleId) === String(addRoleId)
            )
        ) {
            throw new Error(
                "Le rôle à ajouter doit être différent des rôles à vérifier et à retirer."
            );
        }

        if (message.length > 2_000) {
            throw new Error(
                "Le message de bienvenue ne peut pas dépasser 2 000 caractères."
            );
        }
    }

}

module.exports =
    new CharacterApprovalAutomationV2Manager();
