const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const {
    formatDate,
    getCharacterName,
    getEncounterName
} = require("./EncounterUtils");

function addSelection({
    installationId,
    installedCharacters
}) {
    const options = [
        {
            label:
                "Saisir un nom manuellement",
            value:
                "external",
            emoji:
                "✍️",
            description:
                "PNJ ou personnage absent de Greycore"
        },
        ...installedCharacters
            .slice(0, 24)
            .map(
                entry => {
                    const displayName = entry.proxy_name || [entry.firstname,entry.lastname].filter(Boolean).join(" ") || "Personnage";

                    const continuityName =
                        entry.continuity
                            ?.name
                        ||
                        entry.continuity
                            ?.continuity_name
                        ||
                        null;

                    return {
                        label:
                            String(
                                displayName
                            ).slice(0, 100),
                        description:
                            continuityName
                                ? `Continuité : ${String(continuityName).slice(0, 80)}`
                                : "Personnage installé sur ce serveur",
                        value:
                            String(
                                entry.installation_id
                            ),
                        emoji:
                            "👤"
                    };
                }
            )
    ];

    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                `v2_encounter_character:${installationId}`
            )
            .setPlaceholder(
                "Choisir le personnage rencontré"
            )
            .addOptions(options);

    return {
        content:
            "🤝 **Ajouter une rencontre**\n"
            +
            "Choisis un personnage installé ou saisis un nom manuellement.",
        embeds: [],
        components: [
            row(select),
            navigationRow(
                `page:character:encounters:${installationId}`
            )
        ]
    };
}

function manageSelection({
    installationId,
    encounters
}) {
    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                `v2_encounter_manage_select:${installationId}`
            )
            .setPlaceholder(
                "Choisir une rencontre"
            )
            .addOptions(
                encounters
                    .slice(0, 25)
                    .map(
                        encounter => {
                            const details = [];

                            if (
                                encounter.location
                            ) {
                                details.push(
                                    encounter.location
                                );
                            }

                            if (
                                encounter.occurred_at
                            ) {
                                details.push(
                                    formatDate(
                                        encounter
                                            .occurred_at
                                    )
                                );
                            }

                            return {
                                label:
                                    String(
                                        getEncounterName(
                                            encounter
                                        )
                                    ).slice(0, 100),
                                description:
                                    details.length
                                        ? String(
                                            details.join(
                                                " • "
                                            )
                                        ).slice(0, 100)
                                        : "Rencontre enregistrée",
                                value:
                                    String(
                                        encounter.id
                                    ),
                                emoji:
                                    "🤝"
                            };
                        }
                    )
            );

    return {
        content:
            "⚙️ **Gérer une rencontre**\n"
            +
            "Choisis la rencontre à modifier ou supprimer.",
        embeds: [],
        components: [
            row(select),
            navigationRow(
                `page:character:encounters:${installationId}`
            )
        ]
    };
}

function details({
    dashboardData,
    installationId,
    encounter
}) {
    const embed =
        UI.embed.create({
            thumbnail:
                dashboardData
                    .character
                    .avatar_url
                ||
                null,
            description:
                UI.components
                    .characterHeader
                    .build(
                        dashboardData
                            .character
                    )
        });

    embed.addFields({
        name:
            "🤝 Personnage rencontré",
        value:
            `**${getEncounterName(encounter)}**`
    });

    if (encounter.external_name) {
        embed.addFields({
            name:
                "📌 Type",
            value:
                "Personnage externe à Greycore",
            inline:
                true
        });
    }

    if (encounter.occurred_at) {
        embed.addFields({
            name:
                "📅 Date",
            value:
                formatDate(
                    encounter.occurred_at
                ),
            inline:
                true
        });
    }

    if (encounter.location) {
        embed.addFields({
            name:
                "📍 Lieu",
            value:
                encounter.location,
            inline:
                true
        });
    }

    if (encounter.note) {
        embed.addFields({
            name:
                "📝 Résumé",
            value:
                encounter.note
        });
    }

    return UI.page.create({
        embed,
        components: [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.primary({
                        id:
                            `v2_encounter_edit:${installationId}:${encounter.id}`,
                        label:
                            "Modifier",
                        emoji:
                            "✏️"
                    }),
                    UI.button.danger({
                        id:
                            `v2_encounter_delete:${installationId}:${encounter.id}`,
                        label:
                            "Supprimer",
                        emoji:
                            "🗑️"
                    })
                ),
            navigationRow(
                `v2_encounter_manage:${installationId}`
            )
        ]
    });
}

function deleteConfirmation({
    installationId,
    encounterId,
    displayName
}) {
    return {
        content:
            "⚠️ **Supprimer cette rencontre ?**\n\n"
            +
            `🤝 Rencontre avec **${displayName}**\n\n`
            +
            "Cette action est irréversible.",
        embeds: [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.danger({
                        id:
                            `v2_encounter_delete_confirm:${installationId}:${encounterId}`,
                        label:
                            "Supprimer",
                        emoji:
                            "🗑️"
                    }),
                    UI.button.secondary({
                        id:
                            `v2_encounter_details:${installationId}:${encounterId}`,
                        label:
                            "Annuler",
                        emoji:
                            "❌"
                    })
                )
        ]
    };
}

function navigationRow(backId) {
    return new ActionRowBuilder()
        .addComponents(
            UI.button.secondary({
                id:
                    backId,
                label:
                    "Retour",
                emoji:
                    "⬅️"
            }),
            UI.components.navigation
                .close()
        );
}

function row(component) {
    return new ActionRowBuilder()
        .addComponents(component);
}

module.exports = {
    addSelection,
    deleteConfirmation,
    details,
    manageSelection
};
