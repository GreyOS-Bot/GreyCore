const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class ContinuityListView {
    build(
        character,
        continuities,
        {
            mode = "browse"
        } = {}
    ) {
        const isDeployment =
            mode === "deployment";

        const embed =
            new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle(
                    isDeployment
                        ? `🖥️ Installer ${character.proxy_name}`
                        : `📖 Histoires de ${character.proxy_name}`
)
                .setDescription(
                    isDeployment
                        ? this.buildDeploymentDescription(
                            continuities
                        )
                        : continuities.length === 0
                        ? [
                            "Aucune continuité n’est encore enregistrée.",
                            "",
                            "Crée une nouvelle continuité pour commencer une nouvelle version RP de ce personnage."
                        ].join("\n")
                        : [
                            `**${continuities.length} histoire(s)** enregistrée(s).`,                            "",
                            "Sélectionne une histoire pour ouvrir son espace RP.",
                            "",
                            "━━━━━━━━━━━━━━━━━━",
                            "",
                            ...continuities.map(
                                continuity => [
                                    `🌍 **${this.getStoryName(continuity.name)}**`,
                                    `Mode : ${this.getModeLabel(continuity.mode)}`,
                                    `Installations : ${continuity.installation_count || 0}`,
                                    continuity.is_archived === 1
                                        ? "📦 Archivée"
                                        : "✅ Active",
                                    ""
                                ].join("\n")
                            )
                        ].join("\n")
                )
                .setFooter({
                    text:
                        "Greycore V2 • Histoires"
                })
                .setTimestamp();

        if (character.avatar_url) {
            embed.setThumbnail(
                character.avatar_url
            );
        }

        const rows = [];

        if (continuities.length > 0) {
            const menu =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        isDeployment
                            ? `v2_continuity_deploy_select:${character.id}`
                            : `v2_continuity_select:${character.id}`
                    )
                    .setPlaceholder(
                        isDeployment
                            ? "Choisir l’histoire à installer"
                            : "Choisir une histoire"
)
                    .addOptions(
                        continuities
                            .slice(0, 25)
                            .map(continuity => ({
                                label:
    this.getStoryName(
        continuity.name
    ).slice(0, 100),

                                value:
                                    continuity.id,

                                description:
                                    `${this.getModeLabel(
                                        continuity.mode
                                    )} • ${continuity.installation_count || 0} installation(s)`
                                        .slice(0, 100),

                                emoji:
                                    continuity.is_archived === 1
                                        ? "📦"
                                        : "🌍"
                            }))
                    );

            rows.push(
                new ActionRowBuilder()
                    .addComponents(menu)
            );
        }

        const actionButtons = [
            new ButtonBuilder()
                .setCustomId(
                    `v2_character_open:${character.id}`
                )
                .setLabel(
                    "Retour au personnage"
                )
                .setEmoji("◀️")
                .setStyle(
                    ButtonStyle.Secondary
                )
        ];

        if (!isDeployment) {
            actionButtons.push(
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
                    )
            );
        }

        actionButtons.push(
            new ButtonBuilder()
                .setCustomId(
                    "character_close"
                )
                .setLabel(
                    isDeployment
                        ? "Annuler"
                        : "Fermer"
                )
                .setEmoji("❌")
                .setStyle(
                    ButtonStyle.Secondary
                )
        );

        const actions =
            new ActionRowBuilder()
                .addComponents(
                    ...actionButtons
                );

        rows.push(actions);

        return {
            embeds: [embed],
            components: rows
        };
    }

    getStoryName(name) {
    return name
        .replace(/^Continuité\s+/i, "")
        .trim();
}

    buildDeploymentDescription(
        continuities
    ) {
        if (continuities.length === 0) {
            return [
                "Tu n’as encore aucune histoire à installer.",
                "",
                "Crée d’abord un personnage ou une histoire depuis ta bibliothèque."
            ].join("\n");
        }

        return [
            "### Étape 1 sur 3 — Choisir l’histoire",
            "Sélectionne ci-dessous la version RP que tu souhaites installer sur ce serveur.",
            "",
            "Ensuite, Greycore te proposera :",
            "🟢 **Personnage complet** — garde les données de cette histoire.",
            "🔵 **Nouvelle continuité** — crée une nouvelle version RP sur ce serveur.",
            "",
            "Aucune installation n’est créée avant ton choix final."
        ].join("\n");
    }

    getModeLabel(mode) {
    const labels = {
        original: "Histoire originale",
        continued: "Histoire poursuivie",
        reset: "Nouvelle histoire",
        copied: "Histoire copiée",
        imported: "Histoire importée"
    };

    return labels[mode] || mode;
}
}

module.exports =
    new ContinuityListView();
