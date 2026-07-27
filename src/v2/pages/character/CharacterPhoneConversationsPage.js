const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const phoneV2Manager =
    require("../../managers/PhoneV2Manager");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

class CharacterPhoneConversationsPage {

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

        const messageDay =
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
                    messageDay.getTime()
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

    async execute(
        interaction,
        characterId
    ) {

        const dashboardData =
            characterDashboardManager
                .getPlayableDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
                            || null
                    }
                );

        if (
            !dashboardData
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

        let phone =
            phoneV2Manager
                .getPhoneByContinuity(
                    continuity.id
                );

        if (!phone) {

            phone =
                phoneV2Manager.createPhone({

                    continuityId:
                        continuity.id

                });

        }

        /*
         * Discord autorise au maximum
         * 25 options dans un menu déroulant.
         */
        const conversations =
            phoneV2Manager
                .getConversationsForPhone(
                    phone.id
                )
                .slice(
                    0,
                    25
                );

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

                        "### 💬 Conversations",

                        conversations.length
                            ? "Sélectionnez une conversation pour consulter vos messages."
                            : "Aucune conversation pour le moment."

                    ])

            });

        const rows = [];

        if (conversations.length) {

            const selectMenu =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        `v2_phone_conversation_select:${characterId}`
                    )
                    .setPlaceholder(
                        "Choisissez une conversation"
                    )
                    .setMinValues(
                        1
                    )
                    .setMaxValues(
                        1
                    );

            for (
                const conversation
                of conversations
            ) {

                const characterName =
                    conversation
                        .other_character_name
                    ||
                    conversation
                        .other_phone_number
                    ||
                    "Contact inconnu";

                const lastMessage =
                    conversation
                        .last_message_content
                        ?.trim()
                    ||
                    "Aucun message";

                const date =
                    this.getDateText(
                        conversation.updated_at
                        ||
                        conversation.last_message_created_at
                    );

                const description =
                    [
                        conversation.conversation_type === "group"
                            ? "Groupe"
                            : null,
                        date,
                        lastMessage
                    ]
                        .filter(Boolean)
                        .join(" • ");

                selectMenu.addOptions(

                    new StringSelectMenuOptionBuilder()
                        .setLabel(
                            this.truncate(
                                characterName,
                                100
                            )
                        )
                        .setDescription(
                            this.truncate(
                                description,
                                100
                            )
                        )
                        .setEmoji(
                            conversation.conversation_type === "group"
                                ? "👥"
                                : "💬"
                        )
                        .setValue(
                            String(
                                conversation.id
                            )
                        )

                );

            }

            rows.push(

                new ActionRowBuilder()
                    .addComponents(
                        selectMenu
                    )

            );

        }

        rows.push(

            new ActionRowBuilder()
                .addComponents(

                    UI.button.success({

                        id:
                            `v2_phone_new:${characterId}`,

                        label:
                            "Nouveau SMS",

                        emoji:
                            "✉️"

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

                components:
                    rows

            })

        );

    }

}

module.exports =
    new CharacterPhoneConversationsPage();
