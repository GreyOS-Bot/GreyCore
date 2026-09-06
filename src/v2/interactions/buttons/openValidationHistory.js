const v2 =
    require("../../index");

const validationPermissionAccess =
    require(
        "../../core/services/ValidationPermissionAccessService"
    );

const validationHistoryView =
    require(
        "../../views/validation/ValidationHistoryView"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    const installationId =
        interaction.customId
            .split(":")[1];

    if (!installationId) {
        return replyError(
            interaction,
            "Identifiant d’installation invalide."
        );
    }

    const installation =
        v2.managers.validation
            .getInstallation(
                installationId
            );

    if (!installation) {
        return replyError(
            interaction,
            "Installation introuvable."
        );
    }

    if (
        !validationPermissionAccess
            .canRead(
                interaction
            )
    ) {
        return replyError(
            interaction,
            "Seul le staff du serveur peut consulter cet historique."
        );
    }

    const guildId =
        interaction.guildId
        || interaction.guild?.id
        || null;

    if (
        String(installation.guild_id)
        !== String(guildId || "")
    ) {
        return replyError(
            interaction,
            "Cette installation n’appartient pas à ce serveur."
        );
    }

    return replyPrivate(
        interaction,
        validationHistoryView.build({
            installation,
            entries:
                v2.managers.validation
                    .getHistory(
                        installationId
                    )
        })
    );
};
