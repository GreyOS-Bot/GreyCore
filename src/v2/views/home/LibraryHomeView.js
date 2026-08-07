const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

class LibraryHomeView {
    build(
        user,
        statistics,
        characters = []
    ) {
        const displayName =
            user.globalName ||
            user.username ||
            "Utilisateur";

        const embed =
            new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle(
                    "🏠 Accueil · Mon espace GreyCore"
                )
                .setDescription(
                    [
                        `Bienvenue **${displayName}**.`,
                        "",
                        characters.length
                            ? "Choisis un personnage pour ouvrir son tableau de bord, ou navigue dans ton espace personnel."
                            : "Crée ton premier personnage pour accéder aux fonctionnalités de GreyCore.",
                        "",
                        "━━━━━━━━━━━━━━━━━━",
                        "",
                        "📚 **Personnages actifs**",
                        `${statistics.characters}`,
                        "",
                        "🌍 **Continuités**",
                        `${statistics.continuities}`,
                        "",
                        "🖥️ **Installations actives**",
                        `${statistics.installations}`,
                        "",
                        "📦 **Personnages archivés**",
                        `${statistics.archived}`
                    ].join("\n")
                )
                .setFooter({
                    text:
                        "Greycore V2 • Accueil"
                })
                .setTimestamp();

        const components = [];

        if (characters.length) {
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "v2_library_character_select"
                            )
                            .setPlaceholder(
                                "Ouvrir un personnage"
                            )
                            .addOptions(
                                characters
                                    .slice(0, 25)
                                    .map(
                                        character => ({
                                            label:
                                                String(
                                                    character.display_name
                                                    || character.proxy_name
                                                ).slice(0, 100),
                                            value:
                                                String(character.id),
                                            description:
                                                `${character.continuity_count} continuités • ${character.installation_count} installation(s)`
                                                    .slice(0, 100),
                                            emoji: "👤"
                                        })
                                    )
                            )
                    )
            );
        }

        const mainActions =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "v2_library_open"
                        )
                        .setLabel(
                            "Mes personnages"
                        )
                        .setEmoji("📚")
                        .setStyle(
                            ButtonStyle.Primary
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

        const playerActions = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_player_directory")
                .setLabel("Annuaire du serveur")
                .setEmoji("📖")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_player_scenes")
                .setLabel("Scènes RP")
                .setEmoji("🎬")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_player_help")
                .setLabel("Aide")
                .setEmoji("❓")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_player_privacy")
                .setLabel("Confidentialité")
                .setEmoji("🔐")
                .setStyle(ButtonStyle.Secondary)
        );

        const navigation =
            new ActionRowBuilder()
                .addComponents(
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

        components.push(
            mainActions,
            playerActions,
            navigation
        );

        return {
            embeds: [embed],
            components
        };
    }
}

module.exports =
    new LibraryHomeView();
