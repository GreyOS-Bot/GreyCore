const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

class PhoneNewConversationPage {

    async render(
        interaction,
        context
    ) {

        const characterId =
            context.characterId;

        const embed =
            new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle("📩 Nouveau SMS")
                .setDescription(
                    [
                        "Choisissez comment démarrer une conversation.",
                        "",
                        "📇 **Contacts**",
                        "Consulter votre répertoire.",
                        "",
                        "🔎 **Rechercher**",
                        "Chercher un personnage ou un numéro.",
                        "",
                        "👥 **Créer un groupe**",
                        "Réunir plusieurs personnages dans une même conversation."
                    ].join("\n")
                );

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `phone:new:contacts:${characterId}`
                        )
                        .setLabel("Contacts")
                        .setEmoji("📇")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `phone:new:search:${characterId}`
                        )
                        .setLabel("Rechercher")
                        .setEmoji("🔎")
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_phone_group_new:${characterId}`
                        )
                        .setLabel("Créer un groupe")
                        .setEmoji("👥")
                        .setStyle(
                            ButtonStyle.Success
                        )

                );

        const navigation =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_phone_open:${characterId}`
                        )
                        .setLabel("Retour")
                        .setEmoji("⬅️")
                        .setStyle(
                            ButtonStyle.Secondary
                        )

                );

        return interaction.update({
            embeds: [embed],
            components: [
                row,
                navigation
            ]
        });

    }

}

module.exports =
    new PhoneNewConversationPage();
