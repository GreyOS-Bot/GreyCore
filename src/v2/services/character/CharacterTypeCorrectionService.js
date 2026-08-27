const repository = require(
    "../../repositories/CharacterTypeCorrectionRepository"
);
const characterTypes = require(
    "../../core/character/CharacterTypeCatalog"
);
const characterManager = require(
    "../../managers/CharacterV2Manager"
);
const profileManager = require(
    "../../managers/ProfileV2Manager"
);

class CharacterTypeCorrectionService {
    search(
        guildId,
        filter,
        options = {}
    ) {
        return repository
            .searchOnGuild(
                guildId,
                filter,
                options
            );
    }

    getForStaff({ guildId, characterId }) {
        const context = repository.getForStaff(
            guildId,
            characterId
        );

        if (!context) {
            throw new Error(
                "Personnage introuvable sur ce serveur."
            );
        }

        return context;
    }

    correctForStaff({
        guildId,
        characterId,
        changes
    }) {
        const context = this.getForStaff({
            guildId,
            characterId
        });

        return this.applyCorrection(
            context,
            changes
        );
    }

    correct({
        guildId,
        discordUserId,
        characterId,
        changes = {}
    }) {
        const context = repository.getContext({
            guildId,
            discordUserId,
            characterId
        });

        if (!context) {
            throw new Error(
                "Ce personnage n’appartient pas à cet utilisateur sur ce serveur."
            );
        }

        return this.applyCorrection(
            context,
            changes
        );
    }

    applyCorrection(context, changes) {
        const normalized =
            this.normalizeChanges(changes);

        if (Object.keys(normalized).length === 0) {
            throw new Error(
                "Indique au moins une information à corriger."
            );
        }

        if (
            normalized.characterType
            && !characterTypes.isSupported(
                normalized.characterType
            )
        ) {
            throw new Error(
                "Le type de personnage choisi est invalide."
            );
        }

        const characterId = context.id;

        if (normalized.characterType) {
            repository.correctType({
                characterId,
                characterType:
                    normalized.characterType,
                visibility:
                    characterTypes
                        .getInstallationVisibility(
                            normalized.characterType
                        ),
                updatedAt:
                    new Date().toISOString()
            });
        }

        const identity = {};
        if (normalized.proxyName !== undefined) {
            identity.proxyName = normalized.proxyName;
        }
        if (normalized.firstname !== undefined) {
            identity.baseFirstname = normalized.firstname;
        }
        if (normalized.lastname !== undefined) {
            identity.baseLastname = normalized.lastname;
        }
        if (Object.keys(identity).length) {
            characterManager.updateIdentity(
                characterId,
                identity
            );
        }

        const profileChanges = {};
        [
            "alias",
            "firstname",
            "lastname",
            "age",
            "gang",
            "occupation"
        ].forEach(field => {
            if (normalized[field] !== undefined) {
                profileChanges[field] = normalized[field];
            }
        });

        if (Object.keys(profileChanges).length) {
            profileManager.getOrCreate(
                context.continuity_id
            );
            profileManager.update(
                context.continuity_id,
                profileChanges
            );
        }

        const updated = characterManager.getById(
            characterId
        );

        return {
            ...context,
            ...updated,
            character_type:
                normalized.characterType
                || context.character_type,
            visibility:
                characterTypes
                    .getInstallationVisibility(
                        normalized.characterType
                        || context.character_type
                    ),
            changedFields:
                Object.keys(normalized)
                    .map(field =>
                        this.getFieldLabel(field)
                    )
        };
    }

    normalizeChanges(changes) {
        const normalized = {};

        Object.entries(changes).forEach(
            ([field, value]) => {
                if (value === null || value === undefined) {
                    return;
                }

                if (field === "age") {
                    normalized.age = value;
                    return;
                }

                const text = String(value)
                    .normalize("NFC")
                    .trim();

                if (text) {
                    normalized[field] = text;
                }
            }
        );

        return normalized;
    }

    getFieldLabel(field) {
        return ({
            characterType: "type",
            proxyName: "proxy",
            alias: "alias affiché",
            firstname: "vrai prénom",
            lastname: "nom",
            age: "âge",
            gang: "organisation",
            occupation: "métier"
        })[field] || field;
    }
}

module.exports =
    new CharacterTypeCorrectionService();
