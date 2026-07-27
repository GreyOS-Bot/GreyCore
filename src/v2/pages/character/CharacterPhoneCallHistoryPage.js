const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

class CharacterPhoneCallHistoryPage {

    getStatusText(
        status
    ) {

        switch (status) {

            case "ended":
                return "Terminé";

            case "missed":
                return "Appel manqué";

            case "refused":
                return "Refusé";

            case "cancelled":
                return "Annulé";

            case "accepted":
                return "En cours";

            case "ringing":
                return "En attente";

            default:
                return "Appel";

        }

    }

    getDateText(
        value
    ) {

        if (!value) {
            return "";
        }

        const date =
            new Date(value);

        const now =
            new Date();

        const today =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            );

        const callDay =
            new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            );

        const difference =
            Math.round(
                (
                    today.getTime()
                    -
                    callDay.getTime()
                )
                /
                86400000
            );

        if (difference === 0) {

            return date.toLocaleTimeString(
                "fr-FR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        }

        if (difference === 1) {
            return "Hier";
        }

        return date.toLocaleDateString(
            "fr-FR"
        );

    }

    truncate(
        value,
        maximumLength
    ) {

        const text =
            String(
                value || ""
            );

        if (
            text.length
            <=
            maximumLength
        ) {

            return text;

        }

        return (
            text.slice(
                0,
                maximumLength - 3
            )
            +
            "..."
        );

    }

    errorPayload(
        message
    ) {

        return {
            content:
                `❌ ${message}`,
            embeds: [],
            components: []
        };

    }

    async execute(
        interaction,
        characterId
    ) {

        let dashboardData =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
                            ||
                            null
                    }
                );

        if (!dashboardData) {

            dashboardData =
                CharacterDashboardManager
                    .getPlayableDashboardData(
                        characterId,
                        {
                            guildId: null
                        }
                    );

        }

        if (!dashboardData) {

            return interaction.update(
                this.errorPayload(
                    "Personnage introuvable."
                )
            );

        }

        const {
            character,
            continuity
        } = dashboardData;

        if (
            String(
                character.discord_user_id
            )
            !==
            String(
                interaction.user.id
            )
        ) {

            return interaction.update(
                this.errorPayload(
                    "Vous ne pouvez pas consulter ce téléphone."
                )
            );

        }

        if (!continuity) {

            return interaction.update(
                this.errorPayload(
                    "Aucune continuité sélectionnée."
                )
            );

        }

        const phone =
            PhoneV2Manager
                .getPhoneByContinuity(
                    continuity.id
                );

        if (!phone) {

            return interaction.update(
                this.errorPayload(
                    "Téléphone introuvable."
                )
            );

        }

        /*
         * Discord autorise au maximum
         * 25 options dans un menu déroulant.
         */
        const history =
            PhoneV2Manager
                .getCallHistory(
                    phone.id,
                    25
                );

        const embed =
            UI.embed.create({

                thumbnail:
                    character.avatar_url
                    ||
                    null,

                description:
                    UI.text.blocks([

                        UI.components
                            .characterHeader
                            .build(
                                character
                            ),

                        "### 📞 Historique des appels",

                        history.length
                            ? "Sélectionnez un appel pour consulter ses détails et sa conversation."
                            : "Aucun appel enregistré."

                    ])

            });

        const components = [];

        if (history.length) {

            const selectMenu =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        `v2_phone_call_history_select:${characterId}`
                    )
                    .setPlaceholder(
                        "Choisissez un appel"
                    )
                    .setMinValues(
                        1
                    )
                    .setMaxValues(
                        1
                    );

            history.forEach(
                call => {

                    const name =
                        call.other_character_name
                        ||
                        "Inconnu";

                    const date =
                        this.getDateText(
                            call.created_at
                        );

                    const status =
                        this.getStatusText(
                            call.status
                        );

                    selectMenu.addOptions(

                        new StringSelectMenuOptionBuilder()
                            .setLabel(
                                this.truncate(
                                    name,
                                    100
                                )
                            )
                            .setDescription(
                                this.truncate(
                                    `${date} • ${status}`,
                                    100
                                )
                            )
                            .setEmoji(
                                "📞"
                            )
                            .setValue(
                                String(
                                    call.id
                                )
                            )

                    );

                }
            );

            components.push(

                new ActionRowBuilder()
                    .addComponents(
                        selectMenu
                    )

            );

        }

        components.push(

    new ActionRowBuilder()
        .addComponents(

            UI.button.primary({

                id:
                    `v2_phone_call_new:${characterId}`,

                label:
                    "Nouvel appel",

                emoji:
                    "📞"

            }),

            UI.button.secondary({

                id:
                    `v2_phone_open:${characterId}`,

                label:
                    "Retour",

                emoji:
                    "⬅️"

            })

        )

);

        return interaction.update(

            UI.page.create({

                embed,

                components

            })

        );

    }

}

module.exports =
    new CharacterPhoneCallHistoryPage();
