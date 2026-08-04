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

    correctionRequested({
        installationId,
        characterName,
        guildName,
        reason
    }) {
        return {
            embeds: [
                {
                    color: 0xFEE75C,
                    title: "✏️ Modification demandée par le staff",
                    description: [
                        `Le staff de **${guildName || "ton serveur"}** demande une correction sur la fiche de **${characterName || "ton personnage"}**.`,
                        "",
                        "**Modification demandée :**",
                        reason,
                        "",
                        "Le personnage et son proxy sont temporairement bloqués.",
                        "Utilise `/mes personnages`, ouvre ce personnage puis clique sur **Corriger la fiche**. Il redeviendra jouable uniquement après une nouvelle validation du staff."
                    ].join("\n"),
                    footer: {
                        text: `Greycore • Installation #${installationId}`
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        };
    }

    reminder({
        installationId,
        characterName,
        guildName,
        status
    }) {
        const rejected =
            status === "rejected";

        return {
            embeds: [
                {
                    color:
                        0xFEE75C,
                    title:
                        "🔔 Rappel de validation GreyCore",
                    description: [
                        `Le staff de **${guildName || "ton serveur"}** te rappelle que la création de **${characterName || "ton personnage"}** n’est pas encore finalisée.`,
                        "",
                        rejected
                            ? "La fiche doit être corrigée puis renvoyée en validation."
                            : "La demande doit encore être envoyée au staff.",
                        "",
                        "Retourne sur le serveur, utilise `/mes personnages`, sélectionne ce personnage puis termine les étapes affichées."
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

}

module.exports =
    new ValidationDecisionNotificationView();
