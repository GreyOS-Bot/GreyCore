const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class ValidationSubmissionView {

    avatarRequired(
        character,
        installation
    ) {
        return {
            content: [
                "❌ Un avatar est obligatoire avant l’envoi au staff.",
                "",
                "Clique ci-dessous, puis envoie l’image du personnage dans ce salon."
            ].join("\n"),
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_installation_avatar_request:${character.id}:${installation.id}`
                            )
                            .setLabel(
                                "Ajouter l’avatar"
                            )
                            .setEmoji("🖼️")
                            .setStyle(
                                ButtonStyle.Primary
                            )
                    )
            ]
        };
    }

    success({
        character,
        guild,
        validationChannel,
        installationId
    }) {
        return {
            content: [
                `✅ La demande de **${character.proxy_name}** est envoyée.`,
                `Le suivi et la validation se font dans <#${validationChannel.id}>.`,
                `Installation #${installationId}`
            ].join("\n"),
            components: []
        };
    }

}

module.exports =
    new ValidationSubmissionView();
