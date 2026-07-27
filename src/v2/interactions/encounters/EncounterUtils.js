const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

function canManageCharacter(
    interaction,
    character
) {
    return characterManagementPolicy
        .isOwner(
            interaction,
            character
        );
}

function getContinuityId(
    dashboardData
) {
    return (
        dashboardData
            ?.continuity
            ?.continuity_id
        ||
        dashboardData
            ?.continuity
            ?.id
        ||
        null
    );
}

function getCharacterName(
    character,
    profile = null
) {
    return (
        character?.proxy_name
        ||
        character?.name
        ||
        [
            profile?.firstname,
            profile?.lastname
        ]
            .filter(Boolean)
            .join(" ")
        ||
        [
            character?.base_firstname,
            character?.base_lastname
        ]
            .filter(Boolean)
            .join(" ")
        ||
        "Personnage sans nom"
    );
}

function getEncounterName(
    encounter,
    fallback =
        "Personnage inconnu"
) {
    return (
        encounter?.external_name
        ||
        encounter
            ?.other_character_name
        ||
        [
            encounter?.other_firstname,
            encounter?.other_lastname
        ]
            .filter(Boolean)
            .join(" ")
        ||
        fallback
    );
}

function belongsToContinuity(
    encounter,
    continuityId
) {
    return (
        String(
            encounter?.continuity_a_id
        ) ===
            String(continuityId)
        ||
        String(
            encounter?.continuity_b_id
        ) ===
            String(continuityId)
    );
}

function isValidDate(value) {
    if (!value) {
        return true;
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        return false;
    }

    const date =
        new Date(
            `${value}T00:00:00.000Z`
        );

    return (
        !Number.isNaN(
            date.getTime()
        )
        &&
        date
            .toISOString()
            .slice(0, 10) === value
    );
}

function formatDate(value) {
    if (!value) {
        return null;
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value)
            .slice(0, 10);
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);
}

function readTextField(
    interaction,
    fieldId
) {
    return interaction.fields
        .getTextInputValue(
            fieldId
        )
        .trim();
}

module.exports = {
    belongsToContinuity,
    canManageCharacter,
    formatDate,
    getCharacterName,
    getContinuityId,
    getEncounterName,
    isValidDate,
    readTextField
};
