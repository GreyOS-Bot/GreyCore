const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class CharacterAvatarRequiredView {

    build(
        character,
        continuity,
        installation,
        guild
    ) {

        const embed =
            new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle(
                    "🖼️ Avatar obligatoire"
                )
                .setDescription([
                    `**${character.proxy_name}** et sa continuité **${continuity.name}** ont été créés.`,
                    "",
                    `L’installation sur **${guild.name}** est enregistrée en brouillon.`,
                    "",
                    "Envoie maintenant l’image du personnage dans ce salon.",
                    "",
                    "L’avatar doit être ajouté avant que l’installation puisse être envoyée au staff."
                ].join("\n"))
                .setFooter({
                    text:
                        "Greycore V2 • En attente de l’avatar"
                })
                .setTimestamp();

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_character_avatar_request:${character.id}:${installation.id}`
                        )
                        .setLabel(
                            "Ajouter l’avatar"
                        )
                        .setEmoji("🖼️")
                        .setStyle(
                            ButtonStyle.Primary
                        ),
                    new ButtonBuilder()
                        .setCustomId(
                            "v2_library_open"
                        )
                        .setLabel(
                            "Bibliothèque"
                        )
                        .setEmoji("📚")
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
    new CharacterAvatarRequiredView();
