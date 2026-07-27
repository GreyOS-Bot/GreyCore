const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class OutfitV2View {
    build(
        character,
        continuity,
        outfit = null,
        options = {}
    ) {
        const canManage =
            options.canManage === true;

        const embed =
            new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle(
                    `👕 Outfit de ${character.proxy_name}`
                )
                .setFooter({
                    text:
                        "Greycore V2 • Outfit"
                })
                .setTimestamp();

        if (character.avatar_url) {
            embed.setThumbnail(
                character.avatar_url
            );
        }

        if (!outfit) {
            embed.setDescription([
                "Aucune tenue actuelle n’est enregistrée pour cette histoire.",
                "",
                canManage
                    ? "Tu pourras ajouter une image pour définir la tenue actuelle."
                    : "Aucune tenue n’a encore été ajoutée."
            ].join("\n"));
        } else {
            const description = [];

            if (outfit.title) {
                description.push(
                    "🏷️ **Nom de la tenue**",
                    outfit.title,
                    ""
                );
            }

            if (outfit.description) {
                description.push(
                    "📝 **Description**",
                    outfit.description,
                    ""
                );
            }

            const updatedAt =
                outfit.updated_at ||
                outfit.created_at;

            if (updatedAt) {
                const timestamp =
                    Math.floor(
                        new Date(
                            updatedAt
                        ).getTime() / 1000
                    );

                description.push(
                    "🕒 **Dernière mise à jour**",
                    `<t:${timestamp}:R>`
                );
            }

            embed
                .setDescription(
                    description.length
                        ? description.join("\n")
                        : "Tenue actuelle."
                )
                .setImage(
                    outfit.image_url
                );
        }

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_home:${continuity.id}`
                        )
                        .setLabel("Retour")
                        .setEmoji("◀️")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_character_open:${character.id}`
                        )
                        .setLabel("Personnage")
                        .setEmoji("👤")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "character_close"
                        )
                        .setLabel("Fermer")
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
                navigationRow
            ]
        };
    }
}

module.exports =
    new OutfitV2View();