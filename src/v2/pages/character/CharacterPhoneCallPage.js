const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const CharacterV2Manager =
    require("../../managers/CharacterV2Manager");

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

class CharacterPhoneCallPage {

    getStatusText(
        status
    ) {

        switch (status) {

            case "ringing":
                return "📳 Appel en attente...";

            case "accepted":
                return "🟢 Appel connecté";

            case "refused":
                return "🔴 Appel refusé";

            case "missed":
                return "⚫ Appel manqué";

            case "cancelled":
                return "⚪ Appel annulé";

            case "ended":
                return "📴 Appel terminé";

            default:
                return "📞 Appel";

        }

    }

    build(
        options
    ) {

        const {
            character,
            call,
            contactName
        } = options;

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

                        `# 📞 ${contactName}`,

                        "",

                        this.getStatusText(
                            call.status
                        )

                    ])

            });

        const components = [];

        if (
            call.status ===
            "ringing"
        ) {

            components.push(

                new ActionRowBuilder()
                    .addComponents(

                        UI.button.danger({

                            id:
                                `v2_phone_call_end:${call.id}:${character.id}`,

                            label:
                                "Raccrocher",

                            emoji:
                                "📵"

                        })

                    )

            );

        }

        if (
            call.status ===
            "accepted"
        ) {

            components.push(

                new ActionRowBuilder()
                    .addComponents(

                        UI.button.primary({

                            id:
                                `v2_phone_call_speak:${call.id}:${character.id}`,

                            label:
                                "Parler",

                            emoji:
                                "🎙️"

                        }),

                        UI.button.danger({

                            id:
                                `v2_phone_call_end:${call.id}:${character.id}`,

                            label:
                                "Raccrocher",

                            emoji:
                                "📵"

                        })

                    )

            );

        }

        return UI.page.create({

            embed,

            components

        });

    }

    async open(
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

    if (
        !dashboardData
        ||
        !dashboardData.character
        ||
        !dashboardData.continuity
    ) {

        return interaction.update({
            content:
                "❌ Personnage ou continuité introuvable.",
            embeds: [],
            components: []
        });

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

        return interaction.update({
            content:
                "❌ Vous ne pouvez pas utiliser le téléphone de ce personnage.",
            embeds: [],
            components: []
        });

    }

    const phone =
        PhoneV2Manager
            .getPhoneByContinuity(
                continuity.id
            );

    if (!phone) {

        return interaction.update({
            content:
                "❌ Téléphone introuvable.",
            embeds: [],
            components: []
        });

    }

    const call =
        PhoneV2Manager
            .getCallById(
                callId
            );

    if (!call) {

        return interaction.update({
            content:
                "❌ Appel introuvable.",
            embeds: [],
            components: []
        });

    }

    const isParticipant =
        Number(
            call.caller_phone_id
        )
        ===
        Number(
            phone.id
        )
        ||
        Number(
            call.receiver_phone_id
        )
        ===
        Number(
            phone.id
        );

    if (!isParticipant) {

        return interaction.update({
            content:
                "❌ Cet appel ne correspond pas à ce téléphone.",
            embeds: [],
            components: []
        });

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

    const otherContinuity =
        PhoneV2Manager
            .getContinuityByPhone(
                otherPhoneId
            );

    const otherCharacter =
        otherContinuity
            ? CharacterV2Manager
                .getById(
                    otherContinuity.character_id
                )
            : null;

    const contactName =
        otherCharacter?.proxy_name
        ||
        otherCharacter?.name
        ||
        "Correspondant";

    return interaction.update(

        this.build({
            character,
            call,
            contactName
        })

    );

}

    async execute(
        interaction,
        options
    ) {

        const payload =
            this.build(
                options
            );

        if (
            interaction.replied
            ||
            interaction.deferred
        ) {

            return interaction.editReply(
                payload
            );

        }

        return interaction.update(
            payload
        );

    }

}

module.exports =
    new CharacterPhoneCallPage();
