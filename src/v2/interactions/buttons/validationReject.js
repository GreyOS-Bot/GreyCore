const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const v2 =
    require("../../index");

const validationPermissionAccess =
    require(
        "../../core/services/ValidationPermissionAccessService"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "validationReject"
    );

const {
    replyError
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
                .canWrite(
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

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_validation_reject_modal:${installationId}`
                )
                .setTitle(
                    "Demander une correction"
                );

        const reasonInput =
            new TextInputBuilder()
                .setCustomId(
                    "validation_rejection_reason"
                )
                .setLabel(
                    "Correction demandée"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMinLength(5)
                .setMaxLength(1000)
                .setPlaceholder(
                    "Explique ce qui doit être corrigé avant une nouvelle demande."
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    reasonInput
                )
        );

        return interaction.showModal(
            modal
        );
    } catch (error) {
        logger.error(
            "❌ Erreur ouverture refus validation V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible d’ouvrir le formulaire de refus."
        );
    }
};
