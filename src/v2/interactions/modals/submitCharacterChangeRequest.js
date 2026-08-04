const v2 = require("../../index");
const validationStaffPolicy = require(
    "../../core/policies/ValidationStaffPolicy"
);
const notificationService = require(
    "../../services/validation/ValidationNotificationService"
);
const staffTrackingService = require(
    "../../services/validation/InstallationStaffTrackingService"
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
            interaction.customId.split(":")[1];
        const reason = interaction.fields
            .getTextInputValue("character_change_reason")
            .trim();
        const installation =
            v2.managers.validation.getInstallation(
                installationId
            );

        if (!installation) {
            return replyError(
                interaction,
                "Installation introuvable."
            );
        }

        if (
            !validationStaffPolicy.canReview(interaction)
            || String(installation.guild_id) !==
                String(interaction.guildId || "")
        ) {
            return replyError(
                interaction,
                "Seul le staff de ce serveur peut demander cette modification."
            );
        }

        await interaction.deferUpdate();

        v2.managers.validation.suspendInstallation({
            installationId,
            suspendedBy: interaction.user.id,
            reason
        });

        const context =
            v2.managers.validation.getInstallationContext(
                installationId
            );

        await staffTrackingService.sync({
            client: interaction.client,
            guild: interaction.guild,
            installationId,
            requesterId: context?.owner_id
        });

        const notified = await notificationService
            .notifyCorrectionRequested({
                client: interaction.client,
                playerId: context?.owner_id,
                installationId,
                characterName:
                    context?.proxy_name
                    || context?.firstname,
                guildName: interaction.guild?.name,
                reason
            });

        return replyPrivate(
            interaction,
            notified
                ? "✅ Le personnage est bloqué et le propriétaire a reçu la demande de modification."
                : "⚠️ Le personnage est bien bloqué, mais GreyCore n’a pas pu envoyer de message privé au propriétaire."
        );
    } catch (error) {
        return replyError(
            interaction,
            error.message
            || "Impossible d’enregistrer la demande de modification."
        );
    }
};
