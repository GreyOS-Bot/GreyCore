const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const STATUS = {
    draft: {
        emoji: "🟡",
        label: "Brouillon"
    },

    pending: {
        emoji: "🔵",
        label: "En attente"
    },

    approved: {
        emoji: "🟢",
        label: "Validée"
    },

    rejected: {
        emoji: "🔴",
        label: "Refusée"
    },

    suspended: {
        emoji: "⚫",
        label: "Suspendue"
    },

    archived: {
        emoji: "📦",
        label: "Archivée"
    }
};

class InstallationListView {

    build(
        character,
        continuity,
        installations
    ) {

        const embed =
            new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle("🌍 Installations")
                .setDescription([
                    `**${continuity.name}**`,
                    "",
                    installations.length === 0
                        ? "Cette histoire n'est installée sur aucun serveur."
                        : `Cette histoire est installée sur **${installations.length} serveur(s)**.`,
                    "",
                    "Choisis une installation ci-dessous."
                ].join("\n"));

        const rows = [];

        for (
            let i = 0;
            i < installations.length;
            i += 5
        ) {

            const slice =
                installations.slice(
                    i,
                    i + 5
                );

            const row =
                new ActionRowBuilder();

            for (
                const installation
                of slice
            ) {

                const status =
                    STATUS[
                        installation.status
                    ] || STATUS.draft;

                row.addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_installation_open:${installation.id}`
                        )
                        .setLabel(
                            installation.guild_name ||
                            "Serveur"
                        )
                        .setEmoji(
                            status.emoji
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );
            }

            rows.push(row);
        }

        rows.push(

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_installation_create:${continuity.id}`
                        )
                        .setLabel(
                            "Installer sur un serveur"
                        )
                        .setEmoji("➕")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_continuity_open:${continuity.id}`
                        )
                        .setLabel("Retour")
                        .setEmoji("⬅️")
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
                )

        );

        return {

            embeds: [
                embed
            ],

            components: rows
        };

    }

}

module.exports =
    new InstallationListView();