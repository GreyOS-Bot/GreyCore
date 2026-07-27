const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const PhoneCallV2Manager =
    require("../../managers/PhoneCallV2Manager");

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

class CharacterPhoneCallHistoryDetailPage {

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
        return "Date inconnue";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Date inconnue";
    }

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

    const time =
        date.toLocaleTimeString(
            "fr-FR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    if (difference === 0) {
        return `Aujourd’hui à ${time}`;
    }

    if (difference === 1) {
        return `Hier à ${time}`;
    }

    const day =
        date.toLocaleDateString(
            "fr-FR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    return `${day} à ${time}`;

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
        callId,
        characterId
    ) {

        let dashboardData =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
                            || null
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

        const call =
            PhoneCallV2Manager
                .getById(
                    callId
                );

        if (!call) {

            return interaction.update(
                this.errorPayload(
                    "Appel introuvable."
                )
            );

        }

        if (
            Number(
                call.caller_phone_id
            )
            !==
            Number(
                phone.id
            )
            &&
            Number(
                call.receiver_phone_id
            )
            !==
            Number(
                phone.id
            )
        ) {

            return interaction.update(
                this.errorPayload(
                    "Cet appel ne correspond pas à ce téléphone."
                )
            );

        }

        const otherPhoneId =
            Number(
                call.caller_phone_id
            )
            ===
            Number(
                phone.id
            )
                ? call.receiver_phone_id
                : call.caller_phone_id;

        const otherPhone =
    PhoneV2Manager
        .getPhoneById(
            otherPhoneId
        );

if (!otherPhone) {

    return interaction.update(
        this.errorPayload(
            "Le téléphone du correspondant est introuvable."
        )
    );

}

const conversation =
    PhoneV2Manager
        .getOrCreateConversation(
            phone.id,
            otherPhone.id
        );

        const otherContinuity =
            PhoneV2Manager
                .getContinuityByPhone(
                    otherPhoneId
                );

        const otherCharacter =
            otherContinuity
                ? require(
                    "../../managers/CharacterV2Manager"
                ).getById(
                    otherContinuity.character_id
                )
                : null;

        const otherName =
            otherCharacter
                ?.proxy_name
            ||
            otherCharacter
                ?.name
            ||
            "Inconnu";

        const messages =
            PhoneCallV2Manager
                .getMessages(
                    call.id
                );

        const transcript =
            messages.length
                ? messages.map(
                    message => {

                        const name =
                            message.speaker_name
                            || "Inconnu";

                        return [
                            `**${name}**`,
                            message.content
                        ].join("\n");

                    }
                ).join(
                    "\n\n"
                )
                : "Aucune parole enregistrée pour cet appel.";

        const embed =
            UI.embed.create({

                thumbnail:
                    character.avatar_url
                    || null,

                description:
                    UI.text.blocks([

                        UI.components
                            .characterHeader
                            .build(
                                character
                            ),

                        `### 📞 ${otherName}`,

                        `${
                            this.getDateText(
                                call.created_at
                            )
                        } • ${
                            this.getStatusText(
                                call.status
                            )
                        }`,

                        transcript

                    ])

            });

        const components = [
    new ActionRowBuilder()
        .addComponents(

            UI.button.primary({

                id:
                    `v2_phone_call_start:${conversation.id}:${characterId}`,

                label:
                    "Rappeler",

                emoji:
                    "📞"

            }),

            UI.button.secondary({

                id:
                    `v2_phone_calls:${characterId}`,

                label:
                    "Retour",

                emoji:
                    "⬅️"

            })

        )
];

        return interaction.update(

            UI.page.create({

                embed,

                components

            })

        );

    }

}

module.exports =
    new CharacterPhoneCallHistoryDetailPage();
