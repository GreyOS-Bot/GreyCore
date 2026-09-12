const outfitManager =
    require(
        "../../managers/OutfitV2Manager"
    );

const continuityManager =
    require(
        "../../managers/ContinuityV2Manager"
    );

const installationManager = require("../../managers/InstallationV2Manager");

const characterManager =
    require(
        "../../managers/CharacterV2Manager"
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

async function getInstallationContext(
    interaction,
    installationId
) {
    const installation = installationManager.getById(installationId);
    if (!installation || String(installation.guild_id) !== String(interaction.guildId)) {
        await replyError(interaction, "Installation introuvable dans ce serveur.");
        return null;
    }
    const continuity =
        continuityManager.getById(
            installation.continuity_id
        );

    if (!continuity) {
        await replyError(
            interaction,
            "Continuité introuvable."
        );

        return null;
    }

    const character =
        characterManager.getById(
            continuity.character_id
        );

    if (!character) {
        await replyError(
            interaction,
            "Personnage introuvable."
        );

        return null;
    }

    if (
        !characterManagementPolicy
            .isOwner(
                interaction,
                character
            )
    ) {
        await replyError(
            interaction,
            "Tu ne peux pas gérer les tenues de ce personnage."
        );

        return null;
    }

    return {
        installation,
        continuity,
        character
    };
}

async function getOutfitContext(
    interaction,
    outfitId
) {
    const outfit =
        outfitManager.getById(
            outfitId
        );

    if (!outfit) {
        await replyError(
            interaction,
            "Tenue introuvable."
        );

        return null;
    }

    const context =
        await getInstallationContext(
            interaction,
            outfit.installation_id
        );

    if (!context) {
        return null;
    }

    return {
        ...context,
        outfit
    };
}

module.exports = {
    getInstallationContext,
    getContinuityContext: getInstallationContext,
    getOutfitContext
};
