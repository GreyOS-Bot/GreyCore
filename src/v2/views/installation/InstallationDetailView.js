const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const STATUS = {
    draft: {
        emoji:
            "🟡",
        label:
            "Brouillon",
        color:
            0xFEE75C
    },
    pending: {
        emoji:
            "🔵",
        label:
            "En attente du staff",
        color:
            0x3498DB
    },
    approved: {
        emoji:
            "🟢",
        label:
            "Validée",
        color:
            0x57F287
    },
    rejected: {
        emoji:
            "🔴",
        label:
            "Refusée",
        color:
            0xED4245
    },
    suspended: {
        emoji:
            "⚫",
        label:
            "Suspendue",
        color:
            0xE67E22
    },
    archived: {
        emoji:
            "📦",
        label:
            "Archivée",
        color:
            0x747F8D
    }
};

class InstallationDetailView {

    build({
        character,
        continuity,
        installation,
        guildName
    }) {
        const status =
            STATUS[
                installation.status
            ]
            || STATUS.draft;

        const avatar =
            installation
                .local_avatar_url
            || character.avatar_url
            || null;

        const description = [
            `## ${status.emoji} ${guildName}`,
            `**Personnage :** ${character.proxy_name}`,
            `**Continuité :** ${continuity.name}`,
            `**Statut :** ${status.label}`,
            "",
            installation.local_avatar_url
                ? "🖼️ Cette installation utilise son propre avatar."
                : "🖼️ Cette installation utilise encore l’avatar global du personnage."
        ];

        if (
            installation
                .rejection_reason
        ) {
            description.push(
                "",
                "**Motif du refus :**",
                installation
                    .rejection_reason
            );
        }

        const embed =
            new EmbedBuilder()
                .setColor(
                    status.color
                )
                .setTitle(
                    "🌍 Installation serveur"
                )
                .setDescription(
                    description
                        .join(
                            "\n"
                        )
                )
                .setFooter({
                    text:
                        `Greycore • Installation #${installation.id}`
                });

        if (avatar) {
            embed.setThumbnail(
                avatar
            );
        }

        return {
            embeds: [
                embed
            ],
            components:
                this.buildRows({
                    character,
                    continuity,
                    installation,
                    hasAvatar:
                        Boolean(
                            avatar
                        )
                })
        };
    }

    buildRows({
        character,
        continuity,
        installation,
        hasAvatar
    }) {
        const actionButtons = [];

        if (
            [
                "draft",
                "rejected"
            ].includes(
                installation.status
            )
            && hasAvatar
        ) {
            actionButtons.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_install_submit:${installation.id}`
                    )
                    .setLabel(
                        "Envoyer en validation"
                    )
                    .setEmoji(
                        "📨"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    )
            );
        }

        if (
            installation.status !==
            "pending"
        ) {
            actionButtons.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_installation_avatar_request:${character.id}:${installation.id}`
                    )
                    .setLabel(
                        hasAvatar
                            ? "Changer l’avatar"
                            : "Ajouter l’avatar"
                    )
                    .setEmoji(
                        "🖼️"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );
        }

        if (
            installation.status ===
            "rejected"
        ) {
            actionButtons.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_rejection_edit:${installation.id}`
                    )
                    .setLabel(
                        "Corriger la fiche"
                    )
                    .setEmoji(
                        "✏️"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );
        }

        actionButtons.push(
            new ButtonBuilder()
                .setCustomId(
                    `v2_installation_delete:${installation.id}`
                )
                .setLabel(
                    "Supprimer de ce serveur"
                )
                .setEmoji(
                    "🗑️"
                )
                .setStyle(
                    ButtonStyle.Danger
                )
        );

        return [
            new ActionRowBuilder()
                .addComponents(
                    actionButtons
                ),
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_continuity_installations:${continuity.id}`
                        )
                        .setLabel(
                            "Retour"
                        )
                        .setEmoji(
                            "⬅️"
                        )
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
                        .setEmoji(
                            "❌"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                )
        ];
    }

    confirmDelete({
        continuity,
        installation,
        guildName
    }) {
        const embed =
            new EmbedBuilder()
                .setColor(
                    0xED4245
                )
                .setTitle(
                    "⚠️ Supprimer cette installation ?"
                )
                .setDescription([
                    `L’installation de **${continuity.name}** sur **${guildName}** sera supprimée.`,
                    "",
                    "La continuité, son profil et ses installations sur les autres serveurs seront conservés.",
                    "",
                    "Le personnage ne sera plus jouable sur ce serveur."
                ].join("\n"));

        return {
            embeds: [
                embed
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_installation_delete_confirm:${installation.id}`
                            )
                            .setLabel(
                                "Supprimer de ce serveur"
                            )
                            .setEmoji(
                                "🗑️"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_installation_open:${installation.id}`
                            )
                            .setLabel(
                                "Annuler"
                            )
                            .setEmoji(
                                "✖️"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    )
            ]
        };
    }

    deleted({
        continuity,
        guildName
    }) {
        const embed =
            new EmbedBuilder()
                .setColor(
                    0x57F287
                )
                .setTitle(
                    "✅ Installation supprimée"
                )
                .setDescription([
                    `**${continuity.name}** n’est plus installée sur **${guildName}**.`,
                    "",
                    "La continuité et ses autres installations ont été conservées."
                ].join("\n"));

        return {
            embeds: [
                embed
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_continuity_installations:${continuity.id}`
                            )
                            .setLabel(
                                "Voir les autres installations"
                            )
                            .setEmoji(
                                "🌍"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_story_home:${continuity.id}`
                            )
                            .setLabel(
                                "Continuité"
                            )
                            .setEmoji(
                                "📖"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    )
            ]
        };
    }

}

module.exports =
    new InstallationDetailView();
