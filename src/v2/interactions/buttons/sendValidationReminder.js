const v2 = require("../../index");

const validationStaffPolicy =
    require(
        "../../core/policies/ValidationStaffPolicy"
    );

const notificationService =
    require(
        "../../services/validation/ValidationNotificationService"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    const installationId =
        interaction.customId.split(":")[1];

    if (!installationId) {
        return replyError(
            interaction,
            "Identifiant d’installation invalide."
        );
    }

    if (
        !validationStaffPolicy.canReview(
            interaction
        )
    ) {
        return replyError(
            interaction,
            "Seul le staff du serveur peut envoyer ce rappel."
        );
    }

    const installation =
        v2.managers.validation
            .getInstallationContext(
                installationId
            );

    if (!installation) {
        return replyError(
            interaction,
            "Installation introuvable."
        );
    }

    if (
        String(installation.guild_id)
        !== String(interaction.guildId || "")
    ) {
        return replyError(
            interaction,
            "Cette installation n’appartient pas à ce serveur."
        );
    }

    if (
        ![
            "draft",
            "rejected"
        ].includes(installation.status)
    ) {
        return replyError(
            interaction,
            "Cette demande n’a pas besoin d’être relancée."
        );
    }

    const notified =
        await notificationService
            .notifyReminder({
                client:
                    interaction.client,
                playerId:
                    installation.owner_id,
                installationId,
                characterName:
                    installation.proxy_name,
                guildName:
                    interaction.guild?.name,
                status:
                    installation.status
            });

    return replyPrivate(
        interaction,
        notified
            ? `✅ Un rappel privé a été envoyé à <@${installation.owner_id}>.`
            : "⚠️ GreyCore n’a pas pu envoyer le rappel privé. La personne bloque peut-être les messages privés du serveur."
    );
};
