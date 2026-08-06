const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class LibraryView {
    build(characters, options = {}) {
        const page =
            options.page || 1;

        const pageSize =
            options.pageSize || 25;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    characters.length /
                    pageSize
                )
            );

        const safePage =
            Math.min(
                Math.max(page, 1),
                totalPages
            );

        const startIndex =
            (safePage - 1) *
            pageSize;

        const pageCharacters =
            characters.slice(
                startIndex,
                startIndex + pageSize
            );

        const embed =
            new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle(
                    "📚 Ma bibliothèque"
                )
                .setDescription(
                    pageCharacters.length === 0
                        ? [
                            "Aucun personnage actif n’est présent dans ta bibliothèque.",
                            "",
                            "Utilise le bouton **Nouveau personnage** pour commencer.",
                            "",
                            ...this.getInstallationGuidance()
                        ].join("\n")
                        : [
                            `Tu possèdes **${characters.length} personnage(s)** actif(s).`,
                            "",
                            "Sélectionne un personnage ci-dessous pour ouvrir son espace.",
                            "",
                            ...this.getInstallationGuidance(),
                            "",
                            "━━━━━━━━━━━━━━━━━━",
                            "",
                            ...pageCharacters.map(
                                character => [
                                    `👤 **${character.display_name || character.proxy_name}**`,
                                    `🌍 ${character.continuity_count} continuité(s)`,
                                    `🖥️ ${character.installation_count} installation(s)`,
                                    ""
                                ].join("\n")
                            )
                        ].join("\n")
                )
                .setFooter({
                    text:
                        `Greycore V2 • Page ${safePage}/${totalPages}`
                });

        const rows = [];

        if (
            pageCharacters.length > 0
        ) {
            const characterMenu =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "v2_library_character_select"
                    )
                    .setPlaceholder(
                        "Choisir un personnage"
                    )
                    .addOptions(
                        pageCharacters.map(
                            character => ({
                                label:
                                    String(
                                        character.display_name
                                        || character.proxy_name
                                    ).slice(0, 100),

                                value:
                                    character.id,

                                description:
                                    `${character.continuity_count} continuité(s) • ${character.installation_count} installation(s)`
                                        .slice(0, 100),

                                emoji: "👤"
                            })
                        )
                    );

            rows.push(
                new ActionRowBuilder()
                    .addComponents(
                        characterMenu
                    )
            );
        }

        const actions =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_library_previous:${safePage - 1}`
                        )
                        .setLabel("Précédent")
                        .setEmoji("◀️")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(
                            safePage <= 1
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_library_next:${safePage + 1}`
                        )
                        .setLabel("Suivant")
                        .setEmoji("▶️")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(
                            safePage >=
                            totalPages
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "v2_character_create"
                        )
                        .setLabel(
                            "Nouveau personnage"
                        )
                        .setEmoji("➕")
                        .setStyle(
                            ButtonStyle.Success
                        )
                );

        const navigation =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "v2_library_home"
                        )
                        .setLabel(
                            "Vue d’ensemble"
                        )
                        .setEmoji("🏠")
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

        rows.push(
            actions,
            navigation
        );

        return {
            embeds: [embed],
            components: rows
        };
    }

    getInstallationGuidance() {
        return [
            "### 🖥️ Installer sur ce serveur",
            "Depuis le serveur de destination : sélectionne ton personnage, ouvre **Configuration**, puis clique sur **Installer sur ce serveur**.",
            "Tu choisiras ensuite l’histoire et le mode souhaité, avant l’envoi au staff pour validation."
        ];
    }
}

module.exports =
    new LibraryView();
