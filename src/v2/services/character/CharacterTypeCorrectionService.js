const repository = require(
    "../../repositories/CharacterTypeCorrectionRepository"
);
const characterTypes = require(
    "../../core/character/CharacterTypeCatalog"
);

class CharacterTypeCorrectionService {
    correct({
        guildId,
        discordUserId,
        characterId,
        characterType
    }) {
        if (!characterTypes.isSupported(characterType)) {
            throw new Error(
                "Le type de personnage choisi est invalide."
            );
        }

        const result = repository.correct({
            guildId,
            discordUserId,
            characterId,
            characterType,
            visibility:
                characterTypes
                    .getInstallationVisibility(
                        characterType
                    ),
            updatedAt:
                new Date().toISOString()
        });

        if (!result) {
            throw new Error(
                "Ce personnage n’appartient pas à cet utilisateur sur ce serveur."
            );
        }

        return result;
    }
}

module.exports =
    new CharacterTypeCorrectionService();
