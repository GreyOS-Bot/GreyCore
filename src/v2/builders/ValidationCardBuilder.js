const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const characterTypeCatalog =
    require(
        "../core/character/CharacterTypeCatalog"
    );

const STATUS_CONFIG = {
    draft: {
        title:
            "📝 Installation en préparation",
        color:
            0x95A5A6,
        label:
            "Brouillon"
    },

    pending: {
        title:
            "🟡 Installation en attente",
        color:
            0xF1C40F,
        label:
            "En attente"
    },

    approved: {
        title:
            "✅ Installation validée",
        color:
            0x57F287,
        label:
            "Validée"
    },

    rejected: {
        title:
            "❌ Installation refusée",
        color:
            0xED4245,
        label:
            "Refusée"
    },

    suspended: {
        title:
            "⚠️ Installation suspendue",
        color:
            0xE67E22,
        label:
            "Suspendue"
    },

    archived: {
        title:
            "📦 Installation archivée",
        color:
            0x747F8D,
        label:
            "Archivée"
    }
};

const INSTALLATION_STATUSES = [
    "draft",
    "pending",
    "approved",
    "rejected",
    "suspended",
    "archived"
];

class ValidationCardBuilder {
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

    formatModerator(
        value
    ) {
        const text =
            this.cleanText(value);

        /*
         * Lorsqu’une carte est reconstruite sans le membre
         * Discord en mémoire, la base ne contient que son
         * identifiant. Une mention est alors rendue avec son
         * pseudo plutôt que d’afficher ce numéro.
         */
        if (/^\d{16,20}$/.test(text)) {
            return `<@${text}>`;
        }

        return text;
    }

    truncate(
        value,
        maximumLength = 1024,
        fallback = "Non renseigné"
    ) {
        const text =
            this.cleanText(
                value,
                fallback
            );

        if (
            text.length <=
            maximumLength
        ) {
            return text;
        }

        return (
            text.slice(
                0,
                maximumLength - 1
            ) + "…"
        );
    }

    formatDate(
        value
    ) {
        if (!value) {
            return "Non renseignée";
        }

        const timestamp =
            Date.parse(value);

        if (
            Number.isNaN(timestamp)
        ) {
            return this.cleanText(
                value
            );
        }

        const discordTimestamp =
            Math.floor(
                timestamp / 1000
            );

        return [
            `<t:${discordTimestamp}:f>`,
            `<t:${discordTimestamp}:R>`
        ].join("\n");
    }

    isKnownStatus(
        status
    ) {
        return INSTALLATION_STATUSES
            .includes(
                status
            );
    }

    getStatusConfig(
        status
    ) {
        const safeStatus =
            this.isKnownStatus(status)
                ? status
                : "draft";

        return STATUS_CONFIG[
            safeStatus
        ];
    }

    getFullName(
        installation
    ) {
        const firstname =
            installation.firstname ||
            installation.base_firstname;

        const lastname =
            installation.lastname ||
            installation.base_lastname;

        const fullName = [
            firstname,
            lastname
        ]
            .filter(Boolean)
            .map(value =>
                String(value).trim()
            )
            .filter(Boolean)
            .join(" ");

        return (
            fullName ||
            "Non renseignée"
        );
    }

    getOrganization(
        installation
    ) {
        return (
            installation.organization ||
            installation.gang ||
            installation.faction ||
            "Non renseignée"
        );
    }

    getStorySummary(
        installation
    ) {
        return (
            installation.story ||
            installation.story_summary ||
            installation.history ||
            installation.biography ||
            null
        );
    }

    getAvatarUrl(
        installation
    ) {
        return (
            installation.local_avatar_url ||
            installation.global_avatar_url ||
            installation.avatar_url ||
            null
        );
    }

    buildCharacterInformation(
        installation
    ) {
        return [
            `**Nom RP :** ${this.cleanText(
                installation.proxy_name
            )}`,

            `**Type :** ${this.cleanText(
                characterTypeCatalog
                    .getDisplayLabel(
                        installation
                            .character_type
                    )
            )}`,

            `**Identité :** ${this.getFullName(
                installation
            )}`,

            `**Alias :** ${this.cleanText(
                installation.alias
            )}`,

            `**Âge :** ${this.cleanText(
                installation.age
            )}`,

            `**Organisation :** ${this.cleanText(
                this.getOrganization(
                    installation
                )
            )}`
        ].join("\n");
    }

    buildProfileDetails(
        installation
    ) {
        const details = [
            ["Genre", installation.gender],
            ["Date de naissance", installation.birthday],
            ["Date de création", installation.creation_date],
            ["Origine", installation.origin],
            ["M\u00e9tier", installation.occupation],
            ["Taille", installation.height],
            ["Poids", installation.weight],
            ["Faceclaim", installation.faceclaim]
        ].filter(
            ([, value]) => Boolean(
                String(value || "").trim()
            )
        );

        if (!details.length) {
            return null;
        }

        return this.truncate(
            details.map(
                ([label, value]) =>
                    `**${label} :** ${this.cleanText(value)}`
            ).join("\n"),
            1000
        );
    }

    buildCreationStepFields(
        installation
    ) {
        const status =
            installation.status
            || "draft";

        const hasAvatar =
            Boolean(
                this.getAvatarUrl(
                    installation
                )
            );

        const avatarStep = {
            name:
                hasAvatar
                    ? "🟩 Étape 2 — Avatar"
                    : "🟨 Étape 2 — Avatar",
            value:
                hasAvatar
                    ? "Avatar reçu"
                    : "En attente de l’avatar"
        };

        const validationStep = {
            draft: {
                name:
                    hasAvatar
                        ? "🟨 Étape 3 — Validation"
                        : "⬜ Étape 3 — Validation",
                value:
                    hasAvatar
                        ? "Prêt à être envoyé"
                        : "En attente de l’avatar"
            },
            pending: {
                name:
                    "🟨 Étape 3 — Validation",
                value:
                    "En attente du staff"
            },
            approved: {
                name:
                    "🟩 Étape 3 — Validation",
                value:
                    "Installation validée"
            },
            rejected: {
                name:
                    "🟥 Étape 3 — Validation",
                value:
                    "Corrections attendues"
            },
            suspended: {
                name:
                    "🟧 Étape 3 — Validation",
                value:
                    "Installation suspendue"
            },
            archived: {
                name:
                    "⬛ Étape 3 — Validation",
                value:
                    "Installation archivée"
            }
        }[status];

        return [
            {
                name:
                    "🟩 Étape 1 — Fiche",
                value:
                    "Informations enregistrées",
                inline:
                    true
            },
            {
                ...avatarStep,
                inline:
                    true
            },
            {
                ...validationStep,
                inline:
                    true
            }
        ];
    }

    buildInstallationInformation({
        installation,
        guildName
    }) {
        return [
            `**Serveur :** ${this.cleanText(
                guildName ||
                installation.guild_name
            )}`,

            `**Continuité :** ${this.cleanText(
                installation.story_name ||
                installation.continuity_name
            )}`,

            `**Visibilité :** ${this.cleanText(
                installation.visibility
            )}`,

            `**Proxy :** ${
                installation.proxy_enabled
                    ? "Activé"
                    : "Désactivé"
            }`
        ].join("\n");
    }

    buildComponents(
        installationId,
        status,
        hasStory = false
    ) {
        const buttons = [];

        if (status === "pending") {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_validation_approve:${installationId}`
                    )
                    .setLabel(
                        "Valider"
                    )
                    .setEmoji("✅")
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `v2_validation_reject:${installationId}`
                    )
                    .setLabel(
                        "Refuser"
                    )
                    .setEmoji("❌")
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );
        }

        if (
            status === "draft"
            || status === "rejected"
        ) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_validation_remind:${installationId}`
                    )
                    .setLabel(
                        "Envoyer un rappel"
                    )
                    .setEmoji("🔔")
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );
        }

        if (status === "approved") {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_validation_request_change:${installationId}`
                    )
                    .setLabel("Demander une modification")
                    .setEmoji("✏️")
                    .setStyle(ButtonStyle.Danger)
            );
        }

        buttons.push(
            new ButtonBuilder()
                .setCustomId(
                    `v2_validation_history:${installationId}`
                )
                .setLabel(
                    "Historique"
                )
                .setEmoji("📚")
                .setStyle(
                    ButtonStyle.Secondary
                )
        );

        if (hasStory) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_validation_story:${installationId}`
                    )
                    .setLabel(
                        "Histoire compl\u00e8te"
                    )
                    .setEmoji("\u{1F4D6}")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );
        }

        return [
            new ActionRowBuilder()
                .addComponents(
                    ...buttons
                )
        ];
    }

    addStatusDetails({
        embed,
        installation,
        status,
        moderatorDisplay
    }) {
        if (
            status === "approved"
        ) {
            embed.addFields({
                name:
                    "✅ Validation du staff",

                value: [
                    `**Validée par :** ${this.formatModerator(
                        moderatorDisplay ||
                        installation.approved_by ||
                        installation.validated_by
                    )}`,

                    `**Date :** ${this.formatDate(
                        installation.approved_at ||
                        installation.validated_at
                    )}`
                ].join("\n"),

                inline:
                    false
            });
        }

        if (
            status === "rejected"
        ) {
            embed.addFields({
                name:
                    "❌ Décision du staff",

                value: [
                    `**Refusée par :** ${this.formatModerator(
                        moderatorDisplay ||
                        installation.rejected_by
                    )}`,

                    `**Date :** ${this.formatDate(
                        installation.rejected_at
                    )}`,

                    "",
                    `**Motif :** ${this.truncate(
                        installation.rejection_reason,
                        800
                    )}`
                ].join("\n"),

                inline:
                    false
            });
        }

        if (
            status === "suspended"
        ) {
            embed.addFields({
                name:
                    "⚠️ Suspension",

                value: [
                    `**Suspendue par :** ${this.formatModerator(
                        moderatorDisplay ||
                        installation.suspended_by
                    )}`,

                    `**Date :** ${this.formatDate(
                        installation.suspended_at
                    )}`,

                    "",
                    `**Motif :** ${this.truncate(
                        installation.suspension_reason,
                        800
                    )}`
                ].join("\n"),

                inline:
                    false
            });
        }

        if (
            status === "archived"
        ) {
            embed.addFields({
                name:
                    "📦 Archivage",

                value:
                    "Cette installation n’est plus active sur ce serveur.",

                inline:
                    false
            });
        }
    }

    buildInstallation({
        installation,
        guildName,
        requesterDisplay,
        moderatorDisplay
    }) {
        if (!installation) {
            throw new Error(
                "Les données de l’installation sont obligatoires."
            );
        }

        const status =
            installation.status ||
            "draft";

        const statusConfig =
            this.getStatusConfig(
                status
            );

        const avatarUrl =
            this.getAvatarUrl(
                installation
            );

        const embed =
            new EmbedBuilder()
                .setColor(
                    statusConfig.color
                )
                .setTitle(
                    statusConfig.title
                )
                .setDescription([
                    `### ${this.cleanText(
                        installation.proxy_name,
                        "Personnage sans nom"
                    )}`,

                    status === "draft"
                        ? "Création en cours. Cette carte se met à jour automatiquement à chaque étape."
                        : "Le staff dispose ci-dessous des informations nécessaires pour examiner cette installation."
                ].join("\n"))
                .addFields(
                    ...this.buildCreationStepFields(
                        installation
                    ),
                    {
                        name:
                            "🎭 Informations du personnage",

                        value:
                            this.buildCharacterInformation(
                                installation
                            ),

                        inline:
                            false
                    },

                    {
                        name:
                            "📖 Installation demandée",

                        value:
                            this.buildInstallationInformation({
                                installation,
                                guildName
                            }),

                        inline:
                            false
                    },

                    {
                        name:
                            "📝 Résumé du personnage",

                        value:
                            this.truncate(
                                this.getStorySummary(
                                    installation
                                ),
                                1000,
                                "Aucun résumé renseigné."
                            ),

                        inline:
                            false
                    },

                    {
                        name:
                            status === "draft"
                                ? "👤 Utilisateur"
                                : "👤 Demande envoyée par",

                        value:
                            this.cleanText(
                                requesterDisplay ||
                                installation.submitted_by
                            ),

                        inline:
                            true
                    },

                    {
                        name:
                            status === "draft"
                                ? "🕒 Création commencée le"
                                : "🕒 Envoyée le",

                        value:
                            this.formatDate(
                                status === "draft"
                                    ? installation.created_at
                                    : installation.submitted_at
                            ),

                        inline:
                            true
                    }
                )
                .setFooter({
                    text:
                        `Greycore • Installation #${installation.id}`
                })
                .setTimestamp();

        const profileDetails =
            this.buildProfileDetails(
                installation
            );

        if (profileDetails) {
            embed.addFields({
                name:
                    "\u{1F4CB} D\u00e9tails de la fiche",
                value:
                    profileDetails,
                inline:
                    false
            });
        }

        if (avatarUrl) {
            embed.setThumbnail(
                avatarUrl
            );
        }

        this.addStatusDetails({
            embed,
            installation,
            status,
            moderatorDisplay
        });

        const components =
            this.buildComponents(
                installation.id,
                status,
                Boolean(
                    this.getStorySummary(
                        installation
                    )
                )
            );

        return {
            embeds: [
                embed
            ],

            components
        };
    }

    build(
        context
    ) {
        return this.buildInstallation(
            context
        );
    }
}

module.exports =
    new ValidationCardBuilder();
