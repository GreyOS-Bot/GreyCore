const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const phoneV2Manager =
    require("../../managers/PhoneV2Manager");

const {
    errorPayload,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

class CharacterPhonePage {

    async sendPayload(
        interaction,
        payload
    ) {

        if (
            interaction.deferred
            ||
            interaction.replied
        ) {

            return interaction.editReply(
                payload
            );

        }

        if (
            interaction.isButton?.()
            ||
            interaction.isStringSelectMenu?.()
        ) {

            return interaction.update(
                payload
            );

        }

        return replyPrivate(
            interaction,
            payload
        );

    }

    async execute(
        interaction,
        characterId
    ) {

        const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const dashboardData =
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

            return this.sendPayload(
                interaction,
                errorPayload(
                    "Ce personnage n’est pas encore validé et jouable sur ce serveur.",
                    {
                        embeds: [],
                        components: []
                    }
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

            return this.sendPayload(
                interaction,
                errorPayload(
                    "Vous ne pouvez pas utiliser le téléphone de ce personnage.",
                    {
                        embeds: [],
                        components: []
                    }
                )
            );

        }

        if (!continuity) {

            return this.sendPayload(
                interaction,
                errorPayload(
                    "Aucune continuité sélectionnée.",
                    {
                        embeds: [],
                        components: []
                    }
                )
            );

        }

        let phone =
            phoneV2Manager
                .getPhoneByContinuity(
                    continuity.id
                );

        if (!phone) {

            phone =
                phoneV2Manager
                    .createPhone({
                        continuityId:
                            continuity.id
                    });

        }

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

                        "### 📱 Téléphone",

                        `**Numéro**\n${phone.phone_number}`

                    ])

            });

        const row1 =
    new ActionRowBuilder()
        .addComponents(

            UI.button.primary({

                id:
                    `v2_phone_conversations:${characterId}`,

                label:
                    "Conversations",

                emoji:
                    "💬"

            }),

            UI.button.success({

                id:
                    `v2_phone_new:${characterId}`,

                label:
                    "Nouveau SMS",

                emoji:
                    "✉️"

            }),

            UI.button.primary({

                id:
                    `v2_phone_email_new_contact:${characterId}`,

                label:
                    "Nouvel e-mail",

                emoji:
                    "📧"

            }),

            UI.button.secondary({

                id:
                    `v2_phone_calls:${characterId}`,

                label:
                    "Appels",

                emoji:
                    "📞"

            }),

            UI.button.secondary({

                id:
                    `page:character:home:${characterId}`,

                label:
                    "Retour",

                emoji:
                    "⬅️"

            })

        );

        const payload =
            UI.page.create({

                embed,

                components: [
                    row1
                ]

                

            });

            

        return this.sendPayload(
            interaction,
            payload
        );

    }

}

module.exports =
    new CharacterPhonePage();
