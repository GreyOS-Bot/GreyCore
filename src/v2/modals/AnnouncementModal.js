const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

function build() {
    return new ModalBuilder()
        .setCustomId("v2_announcement_submit")
        .setTitle("Publier une annonce")
        .addComponents(
            row(new TextInputBuilder().setCustomId("announcement_mention")
                .setLabel("Mention (facultatif)").setPlaceholder("@everyone, @here ou une mention de rôle")
                .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)),
            row(new TextInputBuilder().setCustomId("announcement_title")
                .setLabel("Titre (facultatif)").setPlaceholder("Mise à jour, nouveauté, annonce spéciale...")
                .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(256)),
            row(new TextInputBuilder().setCustomId("announcement_message")
                .setLabel("Texte de l’annonce").setPlaceholder("Écris ici le contenu de l’annonce.")
                .setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(1).setMaxLength(4000))
        );
}

function row(input) { return new ActionRowBuilder().addComponents(input); }

module.exports = { build };
