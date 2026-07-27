const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class DeploymentSummaryView {
    build(
        character,
        continuity,
        guild
    ) {
        const embed =
            new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(
                    "🟢 Étape 3 sur 3 — Confirmer l’installation"
                )
                .setDescription([
                    `Tu vas installer **${character.proxy_name}** sur ce serveur.`,
                    "",
                    "👤 **Personnage**",
                    character.proxy_name,
                    "",
                    "📖 **Histoire**",
                    continuity.name,
                    "",
                    "🏠 **Serveur**",
                    guild.name,
                    "",
                    "━━━━━━━━━━━━━━━━━━",
                    "",
                    "Cette installation utilisera exactement la même continuité.",
                    "",
                    "Les éléments suivants resteront partagés :",
                    "",
                    "✅ Relations",
                    "✅ Rencontres",
                    "✅ États",
                    "✅ Téléphone",
                    "✅ Outfit",
                    "",
                    "Après la création, tu devras vérifier l’avatar puis envoyer une demande de validation au staff.",
                    "",
                    "🔒 Le personnage restera inutilisable sur ce serveur jusqu’à l’acceptation."
                ].join("\n"))
                .setFooter({
                    text:
                        "Aucune installation ne sera créée avant confirmation."
                });

        const avatar =
            character.avatar_url;

        if (avatar) {
            embed.setThumbnail(avatar);
        }

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_deploy_confirm:${continuity.id}`
                        )
                        .setLabel(
                            "Créer l’installation"
                        )
                        .setEmoji("✅")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_deploy:${continuity.id}`
                        )
                        .setLabel("Retour")
                        .setEmoji("◀️")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_home:${continuity.id}`
                        )
                        .setLabel("Annuler")
                        .setEmoji("❌")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        return {
            embeds: [embed],
            components: [row]
        };
    }
}

module.exports =
    new DeploymentSummaryView();
