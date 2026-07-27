const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const encounterManager =
    require("../../managers/EncounterV2Manager");

const characterDashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

function formatDate(value) {

    if (!value) {
        return null;
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value)
            .slice(0, 10);
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"
        }
    ).format(date);

}

class CharacterEncountersPage {

    async execute(
        interaction,
        characterId
    ) {

const dashboardData =
    characterDashboardManager.getDashboardData(
        characterId,
        {
            guildId: interaction.guildId
        }
    );

        if (!dashboardData) {
            return replyError(
                interaction,
                "Personnage introuvable."
            );
        }

        const continuityId =
            dashboardData.continuity?.id
            || dashboardData.continuity?.continuity_id;

        const isOwner =
            characterManagementPolicy
                .isOwner(
                    interaction,
                    dashboardData.character
                );

        const encounters =
            continuityId
                ? encounterManager.getForContinuity(
                    continuityId
                )
                : [];

        const embed =
            UI.embed.create({

                thumbnail:
                    dashboardData.character.avatar_url
                    || null,

                description:
                    UI.components.characterHeader.build(
                        dashboardData.character
                    )

            });

        if (
            encounters.length === 0
        ) {

            embed.addFields({

                name:
                    "🤝 Rencontres",

                value:
                    "Aucune rencontre enregistrée."

            });

        } else {

            const lines =
                encounters
                    .slice(0, 15)
                    .map(encounter => {

                        const target =
                            encounter.external_name
                            || encounter.other_character_name
                            || [
                                encounter.other_firstname,
                                encounter.other_lastname
                            ]
                                .filter(Boolean)
                                .join(" ")
                            || "Personnage";

                        let line =
                            `🤝 **${target}**`;

                        if (
                            encounter.occurred_at
                        ) {

                            line +=
                                `\n📅 ${formatDate(
                                    encounter.occurred_at
                                )}`;

                        }

                        if (
                            encounter.location
                        ) {

                            line +=
                                ` • 📍 ${encounter.location}`;

                        }

                        if (
                            encounter.note
                        ) {

                            const preview =
                                encounter.note.length > 80
                                    ? `${encounter.note.slice(0, 80)}…`
                                    : encounter.note;

                            line +=
                                `\n📝 ${preview}`;

                        }

                        return line;

                    });

            embed.addFields({

                name:
                    `🤝 Rencontres (${encounters.length})`,

                value:
                    lines.join("\n\n")

            });

        }

        const components = [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({

                        id:
                            `page:character:category:social:${characterId}`,

                        label:
                            "Retour",

                        emoji:
                            "⬅️"

                    }),

                    UI.components.navigation.close()
                )
        ];

        if (isOwner) {
            components.unshift(
                new ActionRowBuilder()
                    .addComponents(
                        UI.button.success({

                            id:
                                `v2_encounter_add:${characterId}`,

                            label:
                                "Ajouter",

                            emoji:
                                "➕"

                        }),

                        UI.button.primary({

                            id:
                                `v2_encounter_manage:${characterId}`,

                            label:
                                "Gérer",

                            emoji:
                                "⚙️",

                            disabled:
                                encounters.length === 0

                        })
                    )
            );
        }

        return interaction.update(

            UI.page.create({

                embed,

                components

            })

        );

    }

}

module.exports =
    new CharacterEncountersPage();
