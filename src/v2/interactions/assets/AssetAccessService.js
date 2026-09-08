const assetManager =
    require("../../managers/AssetV2Manager");

const characterManager =
    require("../../managers/CharacterV2Manager");

const dashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const installationManager =
    require("../../managers/InstallationV2Manager");

const characterManagementPolicy =
    require("../../core/policies/CharacterManagementPolicy");

const staffPermissionDecisionService =
    require("../../core/services/StaffPermissionDecisionService");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

function canManage(interaction, character) {
    return characterManagementPolicy.isOwner(
        interaction,
        character
    ) || canAccessAssets(interaction, true);
}

function canManageTypes(interaction) {
    return canAccessAssets(interaction, true);
}

function canRead(interaction, character) {
    return characterManagementPolicy.isOwner(
        interaction,
        character
    ) || canAccessAssets(interaction, false);
}

function canAccessAssets(interaction, write) {
    return staffPermissionDecisionService.decide({
        interaction,
        permission: "assets",
        write
    }).allowed;
}

async function getCharacterContext(
    interaction,
    characterId,
    {
        requireManage = false,
        installationId = null
    } = {}
) {
    if (!interaction.guildId) {
        await replyError(
            interaction,
            "Les biens sont disponibles depuis un serveur."
        );

        return null;
    }

    const selectedInstallation = installationId
        ? installationManager.getById(installationId)
        : null;

    if (
        installationId
        && (
            !selectedInstallation
            || String(selectedInstallation.guild_id)
                !== String(interaction.guildId)
            || String(selectedInstallation.character_id)
                !== String(characterId)
        )
    ) {
        await replyError(interaction, "Installation introuvable dans ce Context.");
        return null;
    }

    const dashboardData =
        dashboardManager.getPlayableDashboardData(
            characterId,
            {
                guildId: interaction.guildId,
                continuityId: selectedInstallation?.continuity_id
            }
        );

    if (!dashboardData?.continuity || !dashboardData?.installation) {
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
        installation: dashboardData.installation,
        canManage: manages
    };
}

async function getAssetContext(
    interaction,
    assetId,
    {
        requireManage = false,
        requireRead = false,
        contextId = null
    } = {}
) {
    const asset = assetManager.getById(assetId);

    if (
        !asset
        || String(asset.guild_id) !== String(interaction.guildId)
        || contextId && asset.context_id !== contextId
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
                continuityId: asset.continuity_id,
                contextId: asset.context_id
            }
        );

    if (
        !dashboardData
        || Number(dashboardData.installation?.id)
            !== Number(asset.installation_id)
    ) {
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

    const reads = manages || (
        requireRead
        && canRead(interaction, character)
    );

    if (requireManage && !manages) {
        await replyError(
            interaction,
            "Tu ne peux pas gérer ce bien."
        );

        return null;
    }

    if (requireRead && !reads) {
        await replyError(
            interaction,
            "Tu ne peux pas consulter l’historique de ce bien."
        );

        return null;
    }

    return {
        asset,
        character,
        continuity: dashboardData.continuity,
        installation: dashboardData.installation,
        dashboardData,
        canManage: manages
    };
}

module.exports = {
    canManage,
    canManageTypes,
    canRead,
    getCharacterContext,
    getAssetContext
};
