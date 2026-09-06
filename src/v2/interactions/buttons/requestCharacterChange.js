const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const v2 = require("../../index");
const validationPermissionAccess = require(
    "../../core/services/ValidationPermissionAccessService"
);
const { replyError } = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    try {
        const installationId =
            interaction.customId.split(":")[1];
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
            !validationPermissionAccess.canWrite(interaction)
            || String(installation.guild_id) !==
                String(interaction.guildId || "")
        ) {
            return replyError(
                interaction,
                "Seul le staff de ce serveur peut demander cette modification."
            );
        }

        if (installation.status !== "approved") {
            return replyError(
                interaction,
                "Ce personnage n’est pas actuellement validé."
            );
        }

        const reason = new TextInputBuilder()
            .setCustomId("character_change_reason")
            .setLabel("Modification à effectuer")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(1000)
            .setPlaceholder(
                "Explique précisément ce que le joueur doit corriger."
            );

        const modal = new ModalBuilder()
            .setCustomId(
                `v2_validation_request_change_submit:${installationId}`
            )
            .setTitle("Demander une modification")
            .addComponents(
                new ActionRowBuilder().addComponents(reason)
            );

        return interaction.showModal(modal);
    } catch (error) {
        return replyError(
            interaction,
            error.message
            || "Impossible d’ouvrir la demande de modification."
        );
    }
};
