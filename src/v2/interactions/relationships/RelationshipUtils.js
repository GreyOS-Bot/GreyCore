const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

const installationManager =
    require(
        "../../managers/InstallationV2Manager"
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
        dashboardData?.continuity?.continuity_id
        || dashboardData?.continuity?.id
        || null
    );
}

function resolveRelationshipGuildId(
    interaction,
    characterId
) {
    if (interaction?.guildId) {
        return interaction.guildId;
    }

    const guildIds = [
        ...new Set(
            installationManager
                .getByCharacter(
                    characterId
                )
                .filter(
                    installation =>
                        installation.status ===
                            "approved"
                )
                .map(
                    installation =>
                        String(
                            installation.guild_id
                        )
                )
        )
    ];

    return guildIds.length === 1
        ? guildIds[0]
        : null;
}

function validDate(
    value
) {
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
        && date
            .toISOString()
            .slice(0, 10) === value
    );
}

function getCharacterDisplayName(
    character
) {
    return (
        character?.display_name
        || character?.proxy_name
        || character?.name
        || [
            character?.base_firstname,
            character?.base_lastname
        ]
            .filter(Boolean)
            .join(" ")
        || "Personnage sans nom"
    );
}

function relationshipBelongsToContinuity(
    relationship,
    continuityId
) {
    if (
        !relationship
        || !continuityId
    ) {
        return false;
    }

    return (
        String(
            relationship.continuity_a_id
        ) === String(continuityId)
        || String(
            relationship.continuity_b_id
        ) === String(continuityId)
    );
}

module.exports = {
    canManageCharacter,
    getContinuityId,
    resolveRelationshipGuildId,
    validDate,
    getCharacterDisplayName,
    relationshipBelongsToContinuity
};
