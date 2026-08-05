const guildSettingsManager = require(
    "../../managers/GuildSettingsV2Manager"
);

const characterRepository = require(
    "../../repositories/CharacterRepository"
);

class PlayedCharacterCreationLimitService {
    assertCanCreate({
        guildId,
        discordUserId,
        characterType,
        now = new Date()
    }) {
        if (characterType !== "personnage_joue") {
            return;
        }

        const configuration =
            guildSettingsManager
                .getPlayedCharacterCreationLimit(
                    guildId
                );

        if (!configuration.enabled) {
            return;
        }

        const windowMilliseconds =
            configuration.windowDays
            * 24 * 60 * 60 * 1000;

        const since = new Date(
            now.getTime() - windowMilliseconds
        ).toISOString();

        const creations = characterRepository
            .getPlayedCreationDatesForGuildSince(
                discordUserId,
                guildId,
                since
            );

        if (
            creations.length <
                configuration.limitCount
        ) {
            return;
        }

        const oldestTimestamp = Date.parse(
            creations[0].created_at
        );
        const availableAt = Number.isFinite(
            oldestTimestamp
        )
            ? Math.floor(
                (oldestTimestamp
                    + windowMilliseconds)
                / 1000
            )
            : null;

        throw new Error([
            `La limite de ${configuration.limitCount} PJ sur ${configuration.windowDays} jour(s) est atteinte sur ce serveur.`,
            availableAt
                ? `Tu pourras créer un nouveau PJ <t:${availableAt}:R>.`
                : "Réessaie lorsque la période configurée sera écoulée."
        ].join(" "));
    }
}

module.exports =
    new PlayedCharacterCreationLimitService();
