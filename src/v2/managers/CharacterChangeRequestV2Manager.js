const repository =
    require(
        "../repositories/CharacterChangeRequestRepository"
    );

const characterManager =
    require("./CharacterV2Manager");

const profileManager =
    require("./ProfileV2Manager");

const installationManager =
    require("./InstallationV2Manager");

const REQUEST_TYPES = Object.freeze({
    PROFILE_ALIAS:
        "profile_alias",
    PROFILE_IDENTITY:
        "profile_identity",
    PROFILE_INFORMATION:
        "profile_information",
    PROFILE_STORY:
        "profile_story",
    AVATAR:
        "avatar"
});

const REQUEST_FIELDS = Object.freeze({
    [REQUEST_TYPES.PROFILE_ALIAS]: [
        "alias"
    ],
    [REQUEST_TYPES.PROFILE_IDENTITY]: [
        "proxyName",
        "alias",
        "firstname",
        "lastname",
        "age"
    ],
    [REQUEST_TYPES.PROFILE_INFORMATION]: [
        "origin",
        "occupation",
        "gang",
        "height",
        "weight"
    ],
    [REQUEST_TYPES.PROFILE_STORY]: [
        "faceclaim",
        "story"
    ],
    [REQUEST_TYPES.AVATAR]: [
        "avatarUrl"
    ]
});

class CharacterChangeRequestV2Manager {
    get types() {
        return REQUEST_TYPES;
    }

    getById(requestId) {
        return repository.getById(requestId);
    }

    getContext(requestId) {
        const context = repository.getContext(requestId);

        if (!context) {
            return null;
        }

        return {
            ...context,
            changes:
                this.parseChanges(
                    context.changes_json
                )
        };
    }

    create({
        installationId,
        characterId,
        continuityId,
        requestType,
        changes,
        submittedBy
    }) {
        const installation =
            installationManager.getById(
                installationId
            );

        if (!installation) {
            throw new Error(
                "Installation introuvable."
            );
        }

        if (
            installation.status !== "approved"
        ) {
            throw new Error(
                "Seule une installation validée peut demander une modification."
            );
        }

        if (
            installation.character_id !== characterId
            || installation.continuity_id !== continuityId
        ) {
            throw new Error(
                "Cette demande ne correspond pas à l’installation active."
            );
        }

        const character =
            characterManager.getById(characterId);

        if (
            !character
            || String(character.discord_user_id) !==
                String(submittedBy)
        ) {
            throw new Error(
                "Seul le propriétaire peut demander cette modification."
            );
        }

        const normalizedChanges =
            this.normalizeChanges(
                requestType,
                changes
            );

        this.assertChanges(
            requestType,
            continuityId,
            installationId,
            characterId,
            normalizedChanges
        );

        if (
            repository.getPending(
                installationId,
                requestType
            )
        ) {
            throw new Error(
                "Une demande de modification de cette partie de la fiche est déjà en attente du staff."
            );
        }

        const now =
            new Date().toISOString();

        return repository.create({
            installationId,
            characterId,
            continuityId,
            requestType,
            changesJson:
                JSON.stringify(
                    normalizedChanges
                ),
            submittedBy,
            submittedAt:
                now,
            createdAt:
                now,
            updatedAt:
                now
        });
    }

    storeValidationMessage({
        requestId,
        channelId,
        messageId
    }) {
        return repository.storeValidationMessage(
            requestId,
            {
                channelId,
                messageId,
                updatedAt:
                    new Date().toISOString()
            }
        );
    }

    approve({
        requestId,
        reviewedBy
    }) {
        const request =
            this.requirePending(requestId);

        const changes =
            this.parseChanges(
                request.changes_json
            );

        this.applyChanges(
            request,
            changes
        );

        const now =
            new Date().toISOString();

        return repository.approve(
            requestId,
            {
                reviewedBy,
                reviewedAt:
                    now,
                updatedAt:
                    now
            }
        );
    }

    reject({
        requestId,
        reviewedBy,
        reason
    }) {
        const request =
            this.requirePending(requestId);

        const cleanedReason =
            String(reason || "").trim();

        if (!cleanedReason) {
            throw new Error(
                "Le motif du refus est obligatoire."
            );
        }

        const now =
            new Date().toISOString();

        return repository.reject(
            request.id,
            {
                reviewedBy,
                reason:
                    cleanedReason,
                reviewedAt:
                    now,
                updatedAt:
                    now
            }
        );
    }

    cancel(requestId) {
        return repository.cancel(
            requestId,
            new Date().toISOString()
        );
    }

    requirePending(requestId) {
        const request =
            repository.requireById(requestId);

        if (request.status !== "pending") {
            throw new Error(
                "Cette demande de modification est déjà terminée."
            );
        }

        return request;
    }

    applyChanges(request, changes) {
        if (
            request.request_type ===
            REQUEST_TYPES.AVATAR
        ) {
            installationManager.setLocalAvatar(
                request.installation_id,
                changes.avatarUrl
            );

            return;
        }

        if (
            request.request_type ===
            REQUEST_TYPES.PROFILE_IDENTITY
        ) {
            const characterChanges = {};

            if (
                Object.hasOwn(changes, "proxyName")
            ) {
                characterChanges.proxyName =
                    changes.proxyName;
            }

            if (
                Object.hasOwn(changes, "firstname")
            ) {
                characterChanges.baseFirstname =
                    changes.firstname;
            }

            if (
                Object.hasOwn(changes, "lastname")
            ) {
                characterChanges.baseLastname =
                    changes.lastname;
            }

            if (Object.keys(characterChanges).length) {
                characterManager.updateIdentity(
                    request.character_id,
                    characterChanges
                );
            }
        }

        const profileChanges = {
            ...changes
        };

        delete profileChanges.proxyName;

        profileManager.update(
            request.continuity_id,
            profileChanges
        );
    }

    assertChanges(
        requestType,
        continuityId,
        installationId,
        characterId,
        changes
    ) {
        if (
            requestType === REQUEST_TYPES.AVATAR
        ) {
            const currentAvatar =
                installationManager
                    .getEffectiveAvatar(
                        installationId
                    )
                    ?.avatar_url
                || null;

            if (changes.avatarUrl === currentAvatar) {
                throw new Error(
                    "Cet avatar est déjà celui utilisé sur ce serveur."
                );
            }

            return;
        }

        const profile =
            profileManager.getOrCreate(
                continuityId
            );

        const character =
            requestType ===
                REQUEST_TYPES.PROFILE_IDENTITY
                ? characterManager.getById(
                    characterId
                )
                : null;

        const hasDifference =
            Object.entries(changes)
                .some(
                    ([field, value]) =>
                        this.getCurrentValue(
                            profile,
                            character,
                            field
                        ) !== value
                );

        if (!hasDifference) {
            throw new Error(
                "Aucune modification n’a été détectée."
            );
        }
    }

    normalizeChanges(requestType, changes) {
        const fields =
            REQUEST_FIELDS[requestType];

        if (!fields) {
            throw new Error(
                "Type de modification invalide."
            );
        }

        const normalized = {};

        for (const field of fields) {
            const value =
                changes?.[field];

            if (field === "avatarUrl") {
                const avatarUrl =
                    String(value || "").trim();

                if (!avatarUrl) {
                    throw new Error(
                        "Le nouvel avatar est obligatoire."
                    );
                }

                normalized[field] = avatarUrl;
                continue;
            }

            if (field === "proxyName") {
                const proxyName =
                    String(value || "")
                        .normalize("NFC")
                        .trim();

                if (!proxyName) {
                    throw new Error(
                        "Le proxy est obligatoire."
                    );
                }

                normalized[field] = proxyName;
                continue;
            }

            normalized[field] =
                this.normalizeValue(value);
        }

        return normalized;
    }

    normalizeValue(value) {
        const text =
            String(value ?? "").trim();

        return text || null;
    }

    getCurrentValue(
        profile,
        character,
        field
    ) {
        if (field === "proxyName") {
            return this.normalizeValue(
                character?.proxy_name
            );
        }

        return this.normalizeValue(
            profile[field]
        );
    }

    parseChanges(value) {
        try {
            return JSON.parse(value || "{}");
        } catch {
            throw new Error(
                "Les données de cette demande de modification sont invalides."
            );
        }
    }
}

module.exports =
    new CharacterChangeRequestV2Manager();
