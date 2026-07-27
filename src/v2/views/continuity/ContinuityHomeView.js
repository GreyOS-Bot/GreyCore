const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class ContinuityHomeView {
    build(
        character,
        continuity,
        profile,
        installations
    ) {
        const identity = [
            profile?.firstname,
            profile?.lastname
        ]
            .filter(Boolean)
            .join(" ");

        const description = [
            identity
                ? [
                    "📄 **Identité**",
                    identity,
                    ""
                ].join("\n")
                : null,

            profile?.age
                ? [
                    "🎂 **Âge**",
                    String(profile.age),
                    ""
                ].join("\n")
                : null,

            profile?.gang
                ? [
                    "🏴 **Organisation**",
                    profile.gang,
                    ""
                ].join("\n")
                : null,

            "🖥️ **Installations**",
            installations.length === 0
                ? "Cette histoire n’est installée sur aucun serveur."
                : installations
                    .map(installation =>
                        `• <#${installation.guild_id}> — ${this.getStatusLabel(
                            installation.status
                        )}`
                    )
                    .join("\n")
        ]
            .filter(Boolean)
            .join("\n");

        const embed =
            new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle(
    `📖 ${character.proxy_name} • ${this.getStoryName(
        continuity.name
    )}`
)
                .setDescription(description)
                .setFooter({
                    text:
                        "Greycore V2 • Histoire"
                })
                .setTimestamp();

        if (character.avatar_url) {
            embed.setThumbnail(
                character.avatar_url
            );
        }

        const modulesRow =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_relationships:${continuity.id}`
                        )
                        .setLabel("Relations")
                        .setEmoji("❤️")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_encounters:${continuity.id}`
                        )
                        .setLabel("Rencontres")
                        .setEmoji("🤝")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_states:${continuity.id}`
                        )
                        .setLabel("États")
                        .setEmoji("❤️‍🩹")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_phone:${continuity.id}`
                        )
                        .setLabel("Téléphone")
                        .setEmoji("📱")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_outfit:${continuity.id}`
                        )
                        .setLabel("Outfit")
                        .setEmoji("👕")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        const futureModulesRow =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_journal:${continuity.id}`
                        )
                        .setLabel("Journal")
                        .setEmoji("📖")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(true),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_inventory:${continuity.id}`
                        )
                        .setLabel("Inventaire")
                        .setEmoji("🎒")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(true),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_properties:${continuity.id}`
                        )
                        .setLabel("Propriétés")
                        .setEmoji("🏠")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(true),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_story_vehicles:${continuity.id}`
                        )
                        .setLabel("Véhicules")
                        .setEmoji("🚗")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                        .setDisabled(true)
                );

        const actionsRow =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
    `v2_story_deploy:${continuity.id}`
)
                        .setLabel("Installer sur ce serveur")
                        .setEmoji("🖥️")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_character_continuities:${character.id}`
                        )
                        .setLabel("Histoires")
                        .setEmoji("📖")
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
                            `v2_deploy_help:${continuity.id}`
                        )
                        .setLabel(
                            "Guide d’installation"
                        )
                        .setEmoji("❓")
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
            embeds: [embed],
            components: [
                modulesRow,
                futureModulesRow,
                actionsRow
            ]
        };
    }

getStoryName(name) {
    return name
        .replace(/^Continuité\s+/i, "")
        .trim();
}

    getStatusLabel(status) {
        const labels = {
            draft: "Brouillon",
            pending: "En attente",
            approved: "Validée",
            rejected: "Refusée",
            suspended: "Suspendue",
            archived: "Archivée"
        };

        return labels[status] || status;
    }
}

module.exports =
    new ContinuityHomeView();
