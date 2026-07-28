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
                    "Avatar obligatoire"
                )
                .setDescription([
                    `**${character.proxy_name}** et sa continuit\u00e9 **${continuity.name}** ont \u00e9t\u00e9 cr\u00e9\u00e9s.`,
                    "",
                    `L'installation sur **${guild?.name || "ce serveur"}** est enregistr\u00e9e en brouillon.`,
                    "",
                    "Les informations essentielles de la fiche sont d\u00e9j\u00e0 enregistr\u00e9es.",
                    "Tu pourras ajouter des d\u00e9tails comme la taille ou le poids une fois la fiche valid\u00e9e.",
                    "",
                    "Envoie maintenant l'image du personnage dans ce salon.",
                    "",
                    "L'avatar doit \u00eatre ajout\u00e9 avant que l'installation puisse \u00eatre envoy\u00e9e au staff."
                ].join("\n"))
                .setFooter({
                    text:
                        "Greycore V2 \u2022 En attente de l'avatar"
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
                            "Ajouter l'avatar"
                        )
                        .setEmoji("\u{1F5BC}\uFE0F")
                        .setStyle(
                            ButtonStyle.Primary
                        ),
                    new ButtonBuilder()
                        .setCustomId(
                            "v2_library_open"
                        )
                        .setLabel(
                            "Biblioth\u00e8que"
                        )
                        .setEmoji("\u{1F4DA}")
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
