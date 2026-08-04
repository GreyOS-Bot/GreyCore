const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const {
    requireStaffCommandAccess
} = require(
    "../v2/core/services/StaffCommandAccessService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("annonce")
        .setDescription(
            "Publie une annonce dans le salon actuel."
        ),

    async execute(interaction) {
        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId("v2_announcement_submit")
            .setTitle("Publier une annonce");

        const mention = new TextInputBuilder()
            .setCustomId("announcement_mention")
            .setLabel("Mention (facultatif)")
            .setPlaceholder("@everyone, @here ou une mention de rôle")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100);

        const title = new TextInputBuilder()
            .setCustomId("announcement_title")
            .setLabel("Titre (facultatif)")
            .setPlaceholder("Mise à jour, nouveauté, annonce spéciale...")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(256);

        const message = new TextInputBuilder()
            .setCustomId("announcement_message")
            .setLabel("Texte de l'annonce")
            .setPlaceholder("Écris ici le contenu de l'annonce.")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(4000);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(mention),
            new ActionRowBuilder()
                .addComponents(title),
            new ActionRowBuilder()
                .addComponents(message)
        );

        return interaction.showModal(modal);
    }
};
