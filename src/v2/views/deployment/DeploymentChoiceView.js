const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class DeploymentChoiceView {

    build(
        character,
        continuity,
        {
            existingInstallation = null,
            returnCustomId =
                `v2_story_home:${continuity.id}`
        } = {}
    ) {

        const embed =
            new EmbedBuilder()

                .setColor("#2B2D31")

                .setTitle(
                    `🖥️ Étape 2 sur 3 — Installer ${character.proxy_name}`
                )

                .setDescription([

                    `Choisis comment utiliser **${continuity.name}** sur ce serveur.`,
                    "",
                    "🟢 **Personnage complet**",
                    "La même continuité est installée. Les relations, rencontres, états, téléphone et tenues sont conservés.",
                    existingInstallation
                        ? "ℹ️ Cette continuité est déjà installée ici."
                        : null,
                    "",
                    "🔵 **Nouvelle continuité**",
                    "Une nouvelle version est créée avec le nom, l’avatar et l’identité du personnage. L’histoire RP, les relations, les rencontres, les états et le téléphone repartent à zéro.",
                    "",
                    "🖼️ L’avatar actuel sera copié pour ce serveur. Toute modification ultérieure restera locale à cette installation.",
                    "",
                    "### Marche à suivre",
                    "1. Choisis l’un des deux modes ci-dessous.",
                    "2. Vérifie ou ajoute l’avatar.",
                    "3. Envoie l’installation au staff.",
                    "4. Attends la validation : le proxy reste bloqué jusque-là."

                ]
                    .filter(
                        line =>
                            line !== null
                    )
                    .join("\n"));

        if (character.avatar_url) {
            embed.setThumbnail(
                character.avatar_url
            );
        }

        const row1 =
            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            `v2_deploy_continue:${continuity.id}`
                        )

                        .setLabel(
                            "Personnage complet"
                        )

                        .setEmoji("🟢")

                        .setStyle(
                            ButtonStyle.Success
                        )
                        .setDisabled(
                            Boolean(
                                existingInstallation
                            )
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            `v2_deploy_new:${continuity.id}`
                        )

                        .setLabel(
                            "Nouvelle continuité"
                        )

                        .setEmoji("🔵")

                        .setStyle(
                            ButtonStyle.Primary
                        )

                );

        const row2 =
            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            `v2_deploy_help:${continuity.id}`
                        )

                        .setLabel(
                            "Comment faire ?"
                        )

                        .setEmoji("❓")

                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            returnCustomId
                        )

                        .setLabel("Changer d’histoire")

                        .setEmoji("◀️")

                        .setStyle(
                            ButtonStyle.Secondary
                        )

                );

        return {

            embeds: [embed],

            components: [
                row1,
                row2
            ]

        };

    }

}

module.exports =
    new DeploymentChoiceView();
