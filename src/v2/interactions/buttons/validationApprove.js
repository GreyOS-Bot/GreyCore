const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "validationApprove"
    );

const v2 =
    require("../../index");

const validationStaffPolicy =
    require(
        "../../core/policies/ValidationStaffPolicy"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

const notificationService =
    require(
        "../../services/validation/ValidationNotificationService"
    );

module.exports = async interaction => {
    try {
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
            !validationStaffPolicy
                .canReview(
                    interaction
                )
        ) {
            return replyError(
                interaction,
                "Seul le staff du serveur peut valider cette installation."
            );
        }

        if (
            String(
                installation.guild_id
            )
            !==
            String(
                interaction.guildId
                || interaction.guild?.id
                || ""
            )
        ) {
            return replyError(
                interaction,
                "Cette installation n’appartient pas à ce serveur."
            );
        }

        await interaction.deferUpdate();

        v2.managers.validation
            .approveInstallation({
                installationId,
                approvedBy:
                    interaction.user.id
            });

        const validationData =
            v2.managers.validation
                .getInstallationContext(
                    installationId
                );

        if (!validationData) {
            throw new Error(
                "Impossible de reconstruire la carte de validation."
            );
        }

        const requesterId =
            validationData.submitted_by ||
            validationData.owner_id ||
            validationData.user_id ||
            null;

        const validationCard =
            v2.builders.validationCard
                .build({
                    installation:
                        validationData,

                    guildName:
                        interaction.guild?.name ||
                        "Serveur inconnu",

                    requesterDisplay:
                        requesterId
                            ? `<@${requesterId}>`
                            : "Utilisateur inconnu",

                    moderatorDisplay:
                        interaction.member?.displayName
                        || interaction.user.globalName
                        || interaction.user.username
                        || interaction.user.id
                });

        await interaction.editReply(
            validationCard
        );

        const playerId =
            validationData.owner_id
            || validationData.submitted_by
            || null;

        const notified =
            await notificationService
                .notifyApproval({
                    client:
                        interaction.client,
                    playerId,
                    installationId,
                    characterName:
                        validationData
                            .proxy_name,
                    guildName:
                        interaction.guild
                            ?.name
                });

        if (
            playerId
            && !notified
        ) {
            await replyPrivate(
                interaction,
                "⚠️ L’installation est validée, mais Greycore n’a pas pu prévenir le joueur en message privé."
            );
        }
    } catch (error) {
        logger.error(
            "❌ Erreur validation installation V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible de valider cette installation.",
            {
                components: []
            }
        );
    }
};
