const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const STATUS = {
    draft: {
        label:
            "Brouillon",
        color:
            0xFEE75C
    },
    pending: {
        label:
            "En attente du staff",
        color:
            0xF1C40F
    },
    approved: {
        label:
            "Validée",
        color:
            0x57F287
    },
    rejected: {
        label:
            "Refusée",
        color:
            0xED4245
    },
    suspended: {
        label:
            "Suspendue",
        color:
            0xE67E22
    },
    archived: {
        label:
            "Archivée",
        color:
            0x747F8D
    }
};

class InstallationCreatedView {

    build(
        character,
        continuity,
        installation,
        guild,
        {
            created = true,
            mode = null
        } = {}
    ) {

        const status =
            STATUS[
                installation.status
            ]
            || STATUS.draft;

        const avatar =
            installation.local_avatar_url
            || character.avatar_url
            || null;

        const modeLabel =
            (
                mode
                || continuity.mode
            ) === "reset"
                ? "Nouvelle continuité"
                : "Personnage complet";

        const embed =
            new EmbedBuilder()
                .setColor(
                    status.color
                )
                .setTitle(
                    created
                        ? "🖥️ Installation créée"
                        : "ℹ️ Installation déjà existante"
                )
                .setDescription([
                    `**${character.proxy_name}** est rattaché à **${guild.name}**.`,
                    "",
                    `**Mode choisi :** ${modeLabel}`,
                    `**Continuité :** ${continuity.name}`,
                    `**Statut :** ${status.label}`,
                    "",
                    ...this.getInstructions({
                        installation,
                        hasAvatar:
                            Boolean(avatar)
                    })
                ].join("\n"))
                .setFooter({
                    text:
                        `Greycore V2 • Installation #${installation.id}`
                })
                .setTimestamp();

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
                this.buildComponents({
                    character,
                    continuity,
                    installation,
                    hasAvatar:
                        Boolean(avatar)
                })
        };

    }

    getInstructions({
        installation,
        hasAvatar
    }) {

        if (
            installation.status ===
            "approved"
        ) {
            return [
                "✅ Le staff a validé cette installation.",
                "Le personnage et son proxy sont utilisables sur ce serveur."
            ];
        }

        if (
            installation.status ===
            "pending"
        ) {
            return [
                "📨 La demande a déjà été envoyée au staff.",
                "Le personnage reste inutilisable jusqu’à sa décision."
            ];
        }

        if (
            installation.status ===
            "rejected"
            || installation.status ===
                "suspended"
        ) {
            return [
                installation.status === "suspended"
                    ? "✏️ Le staff demande une modification sur cette fiche."
                    : "❌ Le staff a refusé cette installation.",
                "Corrige la fiche, puis renvoie une demande de validation."
            ];
        }

        if (
            installation.status ===
            "suspended"
            || installation.status ===
                "archived"
        ) {
            return [
                "🔒 Cette installation ne permet pas d’utiliser le personnage sur ce serveur."
            ];
        }

        if (!hasAvatar) {
            return [
                "### Prochaine étape",
                "1. Clique sur **Ajouter l’avatar**.",
                "2. Envoie l’image dans ce salon et indique si besoin le cadrage : `haut`, `centre`, `bas`, `gauche`, `droite` ou une combinaison.",
                "3. Clique ensuite sur **Envoyer en validation**.",
                "",
                "🔒 Le proxy reste désactivé pendant toute la préparation."
            ];
        }

        return [
            "### Prochaine étape",
            "✅ Avatar prêt.",
            "Cet avatar est désormais propre à cette installation.",
            "Clique sur **Envoyer en validation** pour transmettre la demande au staff.",
            "",
            "🔒 Le proxy restera désactivé jusqu’à l’acceptation."
        ];

    }

    buildComponents({
        character,
        continuity,
        installation,
        hasAvatar
    }) {

        const components = [];

        if (
            installation.status ===
            "draft"
        ) {
            if (hasAvatar) {
                components.push(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_install_submit:${installation.id}`
                        )
                        .setLabel(
                            "Envoyer en validation"
                        )
                        .setEmoji("📨")
                        .setStyle(
                            ButtonStyle.Success
                        )
                );
            }

            components.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_installation_avatar_request:${character.id}:${installation.id}`
                    )
                    .setLabel(
                        hasAvatar
                            ? "Changer l’avatar"
                            : "Ajouter l’avatar"
                    )
                    .setEmoji("🖼️")
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );
        }

        if (
            installation.status ===
            "rejected"
            || installation.status ===
                "suspended"
        ) {
            components.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_rejection_edit:${installation.id}`
                    )
                    .setLabel(
                        "Corriger la fiche"
                    )
                    .setEmoji("✏️")
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );
        }

        if (
            installation.status ===
            "approved"
        ) {
            components.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_story_home:${continuity.id}`
                    )
                    .setLabel(
                        "Continuité"
                    )
                    .setEmoji("📖")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );
        }

        components.push(
            new ButtonBuilder()
                .setCustomId(
                    `v2_deploy_help:${continuity.id}`
                )
                .setLabel(
                    "Aide"
                )
                .setEmoji("❓")
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

        return [
            new ActionRowBuilder()
                .addComponents(
                    components
                )
        ];

    }

}

module.exports =
    new InstallationCreatedView();
