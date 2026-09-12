const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

const stateTypeManager =
    require(
        "../../managers/StateTypeV2Manager"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

function getContinuityId(
    dashboardData
) {
    return (
        dashboardData
            ?.continuity
            ?.continuity_id
        || dashboardData
            ?.continuity
            ?.id
        || null
    );
}

function getInstallationId(dashboardData) {
    return dashboardData?.installation?.id || null;
}

function getInstallationScope(dashboardData, actorId) {
    const installation = dashboardData?.installation;
    if (!installation) return null;
    return {
        installationId: installation.id,
        guildId: installation.guild_id,
        contextId: installation.context_id,
        actorId
    };
}

async function getManageableDashboard(
    interaction,
    characterId,
    deniedMessage =
        "Tu ne peux pas gérer les états de ce personnage.",
    installationId = null
) {
    const dashboardData =
        characterDashboardManager
            .getPlayableDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId,
                    installationId
                }
            );

    if (!dashboardData) {
        await replyError(
            interaction,
            "Ce personnage n’est pas jouable sur ce serveur."
        );

        return null;
    }

    if (
        !characterManagementPolicy
            .isOwner(
                interaction,
                dashboardData.character
            )
    ) {
        await replyError(
            interaction,
            deniedMessage
        );

        return null;
    }

    if (
        !getContinuityId(
            dashboardData
        )
    ) {
        await replyError(
            interaction,
            "La continuité du personnage est introuvable."
        );

        return null;
    }

    if (!getInstallationId(dashboardData)) {
        await replyError(interaction, "L’installation du personnage est introuvable.");
        return null;
    }

    return dashboardData;
}

async function getGuildStateType(
    interaction,
    stateTypeId
) {
    const stateType =
        stateTypeManager
            .getStateTypeById(
                Number(
                    stateTypeId
                )
            );

    if (
        !stateType
        ||
        String(
            stateType.guildId
        )
        !==
        String(
            interaction.guildId
        )
    ) {
        await replyError(
            interaction,
            "Ce type d’état n’appartient pas à ce serveur."
        );

        return null;
    }

    return stateType;
}

module.exports = {
    getContinuityId,
    getInstallationId,
    getInstallationScope,
    getGuildStateType,
    getManageableDashboard
};
