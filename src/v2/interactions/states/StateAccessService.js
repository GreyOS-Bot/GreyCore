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

async function getManageableDashboard(
    interaction,
    characterId,
    deniedMessage =
        "Tu ne peux pas gérer les états de ce personnage."
) {
    const dashboardData =
        characterDashboardManager
            .getPlayableDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId
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
    getGuildStateType,
    getManageableDashboard
};
