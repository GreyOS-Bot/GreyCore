const v2 =
    require("../../index");

const notificationService =
    require(
        "../../services/validation/ValidationNotificationService"
    );

const validationStaffPolicy =
    require(
        "../../core/policies/ValidationStaffPolicy"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "rejectValidation"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
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

        const reason =
            interaction.fields
                .getTextInputValue(
                    "validation_rejection_reason"
                )
                .trim();

        if (!reason) {
            return replyError(
                interaction,
                "Le motif du refus est obligatoire."
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
                "Seul le staff du serveur peut refuser cette installation."
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
            .rejectInstallation({
                installationId,
                rejectedBy:
                    interaction.user.id,
                reason
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
            validationData.submitted_by
            || validationData.owner_id
            || null;

        const characterName =
            validationData.proxy_name ||
            validationData.firstname ||
            "Personnage";

        const guildName =
            interaction.guild?.name ||
            "le serveur";

        const validationCard =
            v2.builders.validationCard
                .build({
                    installation:
                        validationData,

                    guildName,

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

        const notificationMethod =
            await notificationService
                .notifyRejection({
                    client:
                        interaction.client,
                    requesterId,
                    installationId,
                    characterName,
                    guildName,
                    reason
                });

        logger.info(
            "📨 Notification de refus :",
            {
                installationId,
                requesterId,
                method:
                    notificationMethod ||
                    "failed"
            }
        );

        if (!notificationMethod) {
            await replyPrivate(
                interaction,
                [
                    "⚠️ Le refus a bien été enregistré.",
                    "",
                    "Greycore n’a toutefois pas pu notifier le joueur : ses messages privés sont peut-être fermés et le salon d’installation est inaccessible."
                ].join("\n")
            );
        }
    } catch (error) {
        logger.error(
            "❌ Erreur refus installation V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible de refuser cette installation."
        );
    }
};
