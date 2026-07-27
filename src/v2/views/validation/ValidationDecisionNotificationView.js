const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class ValidationDecisionNotificationView {

    approved({
        installationId,
        characterName,
        guildName
    }) {
        return {
            embeds: [
                {
                    color:
                        0x57F287,
                    title:
                        "✅ Installation validée",
                    description: [
                        `L’installation de **${characterName || "ton personnage"}** sur **${guildName || "le serveur"}** a été acceptée.`,
                        "",
                        "Le personnage et son proxy sont maintenant utilisables sur ce serveur."
                    ].join("\n"),
                    footer: {
                        text:
                            `Greycore • Installation #${installationId}`
                    },
                    timestamp:
                        new Date()
                            .toISOString()
                }
            ]
        };
    }

    rejected({
        installationId,
        characterName,
        guildName,
        reason
    }) {
        return {
            embeds: [
                {
                    color:
                        0xED4245,
                    title:
                        "🔴 Installation refusée",
                    description: [
                        `L’installation de **${characterName || "Personnage"}** sur **${guildName || "le serveur"}** a été refusée.`,
                        "",
                        "**Motif du refus :**",
                        reason,
                        "",
                        "Corrige la fiche du personnage, puis renvoie l’installation en validation."
                    ].join("\n"),
                    footer: {
                        text:
                            `Greycore • Installation #${installationId}`
                    },
                    timestamp:
                        new Date()
                            .toISOString()
                }
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_rejection_edit:${installationId}`
                            )
                            .setLabel(
                                "Modifier la fiche"
                            )
                            .setEmoji("✏️")
                            .setStyle(
                                ButtonStyle.Primary
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_install_submit:${installationId}`
                            )
                            .setLabel(
                                "Relancer la validation"
                            )
                            .setEmoji("📨")
                            .setStyle(
                                ButtonStyle.Success
                            )
                    )
            ]
        };
    }

}

module.exports =
    new ValidationDecisionNotificationView();
