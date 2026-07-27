const assetManager =
    require("../../managers/AssetV2Manager");

const characterManager =
    require("../../managers/CharacterV2Manager");

const dashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const characterManagementPolicy =
    require("../../core/policies/CharacterManagementPolicy");

const validationStaffPolicy =
    require("../../core/policies/ValidationStaffPolicy");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

function canManage(interaction, character) {
    return characterManagementPolicy.isOwner(
        interaction,
        character
    ) || validationStaffPolicy.canManageServerTools(
        interaction
    );
}

function canManageTypes(interaction) {
    return validationStaffPolicy.canManageServerTools(
        interaction
    );
}

async function getCharacterContext(
    interaction,
    characterId,
    {
        requireManage = false
    } = {}
) {
    if (!interaction.guildId) {
        await replyError(
            interaction,
            "Les biens sont disponibles depuis un serveur."
        );

        return null;
    }

    const dashboardData =
        dashboardManager.getPlayableDashboardData(
            characterId,
            {
                guildId: interaction.guildId
            }
        );

    if (!dashboardData?.continuity) {
        await replyError(
            interaction,
            "Ce personnage n’est pas jouable sur ce serveur."
        );

        return null;
    }

    const manages = canManage(
        interaction,
        dashboardData.character
    );

    if (requireManage && !manages) {
        await replyError(
            interaction,
            "Tu ne peux pas gérer les biens de ce personnage."
        );

        return null;
    }

    return {
        dashboardData,
        character: dashboardData.character,
        continuity: dashboardData.continuity,
        canManage: manages
    };
}

async function getAssetContext(
    interaction,
    assetId,
    {
        requireManage = false
    } = {}
) {
    const asset = assetManager.getById(assetId);

    if (
        !asset
        || String(asset.guild_id) !== String(interaction.guildId)
    ) {
        await replyError(
            interaction,
            "Bien introuvable sur ce serveur."
        );

        return null;
    }

    const character =
        characterManager.getById(
            asset.character_id
        );

    if (!character) {
        await replyError(
            interaction,
            "Le propriétaire de ce bien est introuvable."
        );

        return null;
    }

    const dashboardData =
        dashboardManager.getPlayableDashboardData(
            character.id,
            {
                guildId: interaction.guildId,
                continuityId: asset.continuity_id
            }
        );

    if (!dashboardData) {
        await replyError(
            interaction,
            "Ce bien n’est plus lié à une continuité jouable."
        );

        return null;
    }

    const manages = canManage(
        interaction,
        character
    );

    if (requireManage && !manages) {
        await replyError(
            interaction,
            "Tu ne peux pas gérer ce bien."
        );

        return null;
    }

    return {
        asset,
        character,
        continuity: dashboardData.continuity,
        dashboardData,
        canManage: manages
    };
}

module.exports = {
    canManage,
    canManageTypes,
    getCharacterContext,
    getAssetContext
};
