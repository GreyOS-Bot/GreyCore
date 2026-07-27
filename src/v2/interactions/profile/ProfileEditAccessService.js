const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const profileManager =
    require(
        "../../managers/ProfileV2Manager"
    );

const installationManager =
    require(
        "../../managers/InstallationV2Manager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const {
    getContinuityId
} = require("./ProfileEditUtils");

function canEdit(
    interaction,
    character
) {
    return characterManagementPolicy
        .isOwner(
            interaction,
            character
        );
}

function getDashboard(
    interaction,
    characterId
) {
    return characterDashboardManager
        .getDashboardData(
            characterId,
            {
                guildId:
                    interaction.guildId
            }
        );
}

async function getEditableDashboard(
    interaction,
    characterId
) {
    const dashboardData =
        getDashboard(
            interaction,
            characterId
        );

    if (!dashboardData) {
        await replyError(
            interaction,
            "Ce personnage est introuvable."
        );

        return null;
    }

    if (
        !canEdit(
            interaction,
            dashboardData.character
        )
    ) {
        await replyError(
            interaction,
            "Vous ne pouvez pas modifier la fiche de ce personnage."
        );

        return null;
    }

    return dashboardData;
}

async function getWritableProfile(
    interaction,
    characterId
) {
    const dashboardData =
        await getEditableDashboard(
            interaction,
            characterId
        );

    if (!dashboardData) {
        return null;
    }

    const continuityId =
        getContinuityId(
            dashboardData
        );

    if (!continuityId) {
        await replyError(
            interaction,
            "La continuité du personnage est introuvable."
        );

        return null;
    }

    profileManager.getOrCreate(
        continuityId
    );

    const installation =
        interaction.guildId
            ? installationManager
                .getByContinuityAndGuild(
                    continuityId,
                    interaction.guildId
                )
            : null;

    if (!installation) {
        await replyError(
            interaction,
            "Cette fiche doit être modifiée depuis un serveur où cette continuité est installée."
        );

        return null;
    }

    return {
        dashboardData,
        continuityId,
        installation
    };
}

module.exports = {
    canEdit,
    getDashboard,
    getEditableDashboard,
    getWritableProfile
};
