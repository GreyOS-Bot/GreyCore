const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class CharacterHomeView {
    cleanText(
        value,
        fallback = "Non renseigné"
    ) {
        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        const text =
            String(value).trim();

        return text || fallback;
    }

    getIdentity(character) {
        const identity = [
            character.base_firstname,
            character.base_lastname
        ]
            .filter(Boolean)
            .map(value =>
                String(value).trim()
            )
            .filter(Boolean)
            .join(" ");

        return (
            identity ||
            "Non renseignée"
        );
    }

    build(character) {
        if (!character) {
            throw new Error(
                "Les données du personnage sont obligatoires."
            );
        }

        const continuityCount =
            Number(
                character.continuity_count
            ) || 0;

        const installationCount =
            Number(
                character.installation_count
            ) || 0;

        const archived =
            Number(
                character.is_archived
            ) === 1;

        const embed =
            new EmbedBuilder()
                .setColor(
                    archived
                        ? 0x747F8D
                        : 0x2B2D31
                )
                .setTitle(
                    `👤 ${this.cleanText(
                        character.proxy_name,
                        "Personnage sans nom"
                    )}`
                )
                .setDescription([
                    "### Personnage global",
                    "",
                    "Cet espace rassemble toutes les histoires et installations de ce personnage."
                ].join("\n"))
                .addFields(
                    {
                        name:
                            "🎭 Nom RP",

                        value:
                            this.cleanText(
                                character.proxy_name
                            ),

                        inline:
                            true
                    },

                    {
                        name:
                            "📄 Identité de base",

                        value:
                            this.getIdentity(
                                character
                            ),

                        inline:
                            true
                    },

                    {
                        name:
                            "📦 Statut",

                        value:
                            archived
                                ? "Archivé"
                                : "Actif",

                        inline:
                            true
                    },

                    {
                        name:
                            "📖 Histoires",

                        value:
                            continuityCount === 0
                                ? "Aucune histoire"
                                : `${continuityCount} histoire(s)`,

                        inline:
                            true
                    },

                    {
                        name:
                            "🖥️ Installations",

                        value:
                            installationCount === 0
                                ? "Aucune installation active"
                                : `${installationCount} installation(s) active(s)`,

                        inline:
                            true
                    }
                )
                .setFooter({
                    text:
                        `Greycore V2 • Personnage global • ${character.id}`
                })
                .setTimestamp();

        if (character.avatar_url) {
            embed.setThumbnail(
                character.avatar_url
            );
        }

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_character_continuities:${character.id}`
                        )
                        .setLabel(
                            "Histoires"
                        )
                        .setEmoji("📖")
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
                navigationRow
            ]
        };
    }
}

module.exports =
    new CharacterHomeView();