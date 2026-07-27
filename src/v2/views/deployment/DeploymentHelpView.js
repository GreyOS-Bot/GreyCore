const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class DeploymentHelpView {

    build(
        character,
        continuity,
        guild
    ) {

        const embed =
            new EmbedBuilder()
                .setColor(
                    "#5865F2"
                )
                .setTitle(
                    "❓ Installer un personnage sur un serveur"
                )
                .setDescription([
                    `Tu prépares l’installation de **${character.proxy_name}** sur **${guild.name}**.`,
                    "",
                    "### Depuis un nouveau serveur",
                    "1. Utilise `/mes personnages` sur le serveur de destination.",
                    "2. Ouvre le personnage, puis **Configuration**.",
                    "3. Clique sur **Installer sur ce serveur**.",
                    `4. Sélectionne **${continuity.name}**.`,
                    "",
                    "### Quel mode choisir ?",
                    "🟢 **Personnage complet** : utilise exactement la même continuité et conserve toutes ses données RP.",
                    "",
                    "🔵 **Nouvelle continuité** : conserve l’identité globale et l’avatar, mais crée une version RP vide avec un nouveau téléphone.",
                    "",
                    "🖼️ **Avatar** : l’image actuelle est copiée lors de l’installation. Si tu la modifies ensuite, le changement concernera uniquement ce serveur.",
                    "",
                    "### Après l’installation",
                    "5. Ajoute un avatar si Greycore le demande.",
                    "6. Clique sur **Envoyer en validation**.",
                    "7. Le staff accepte ou refuse la demande dans son salon de validation.",
                    "",
                    "🔒 Le personnage et son proxy restent inutilisables sur ce serveur tant que le staff ne l’a pas validé."
                ].join("\n"))
                .setFooter({
                    text:
                        "Greycore V2 • Guide d’installation"
                });

        if (character.avatar_url) {
            embed.setThumbnail(
                character.avatar_url
            );
        }

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_deploy:${continuity.id}`
                        )
                        .setLabel(
                            "Commencer"
                        )
                        .setEmoji("🖥️")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_home:${continuity.id}`
                        )
                        .setLabel(
                            "Retour"
                        )
                        .setEmoji("◀️")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "character_close"
                        )
                        .setLabel(
                            "Fermer"
                        )
                        .setEmoji("❌")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        return {
            embeds: [
                embed
            ],
            components: [
                row
            ]
        };

    }

}

module.exports =
    new DeploymentHelpView();
