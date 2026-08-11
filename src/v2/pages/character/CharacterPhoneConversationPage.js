const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const PhoneConversationV2Manager =
    require(
        "../../managers/PhoneConversationV2Manager"
    );

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

class CharacterPhoneConversationPage {

    getMessageDateText(
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

    const time =
        date.toLocaleTimeString(
            "fr-FR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    if (difference === 0) {
        return `Aujourd’hui • ${time}`;
    }

    if (difference === 1) {
        return `Hier • ${time}`;
    }

    return `${date.toLocaleDateString(
        "fr-FR"
    )} • ${time}`;

}

    async execute(
        interaction,
        conversationId,
        characterId
    ) {

        const dashboardData =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
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

        const phone =
            PhoneV2Manager
                .getPhoneByContinuity(
                    continuity.id
                );

        if (!phone) {
            return interaction.update({
                content:
                    "❌ Aucun téléphone n’est configuré pour cette continuité.",
                embeds: [],
                components: []
            });
        }

        const conversation =
            PhoneV2Manager
                .getConversationById(
                    conversationId
                );

        if (!conversation) {
            return interaction.update({
                content:
                    "❌ Conversation introuvable.",
                embeds: [],
                components: []
            });
        }

        const participants =
            PhoneConversationV2Manager
                .getParticipants(
                    conversation.id
                );

        const isParticipant =
            participants.some(
                participant =>
                    Number(participant.phone_id) ===
                    Number(phone.id)
            );

        if (!isParticipant) {
            return interaction.update({
                content:
                    "❌ Ce téléphone n’appartient pas à cette conversation.",
                embeds: [],
                components: []
            });
        }

        const conversationName =
            PhoneConversationV2Manager
                .getDisplayName(
                    conversation,
                    phone.id
                );

        const participantText =
            conversation.conversation_type === "group"
                ? participants
                    .map(
                        participant =>
                            participant.character_name
                            || participant.external_name
                            || participant.phone_number
                            || participant.external_phone
                            || "Contact inconnu"
                    )
                    .join(" • ")
                : null;

        const messages =
            PhoneV2Manager.getMessages(
                conversation.id,
                10
            );

        const messageLines = [];

for (const message of messages) {

    const senderName =
        message.sender_character_name
        ||
        message.sender_phone_number
        ||
        "Contact inconnu";

    const isMms =
        message.message_type === "mms"
        && Boolean(message.media_url);
    const isEmail = message.message_type === "email";
    const isVoicemail =
        message.message_type === "voicemail";

    const content =
        isMms
            ? [
                message.content?.trim()
                || "🖼️ Média",
                `[Voir ${
                    message.media_content_type === "image/gif"
                        ? "le GIF"
                        : "l’image"
                }](${message.media_url})`
            ].join("\n")
            : isEmail
                ? `📧 **${message.subject || "Sans objet"}**\n${message.content?.trim() || "Message vide"}`
            : isVoicemail
                ? `📼 **Message vocal**\n${message.content?.trim() || "Message vide"}`
            : message.content?.trim()
            || "Message vide";

    const isMine =
        Number(
            message.sender_phone_id
        )
        ===
        Number(
            phone.id
        );

    const dateText =
    this.getMessageDateText(
        message.created_at
    );

messageLines.push(
    [
        `> ${
            isMine
                ? "**Moi**"
                : `**${senderName}**`
        }`,

        `> ${content}`,

        dateText
            ? `-# ${dateText}`
            : null

    ]
        .filter(Boolean)
        .join("\n")
);

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
                            .build(character),

                        `### ${
                            conversation.conversation_type === "group"
                                ? "👥"
                                : "💬"
                        } ${conversationName}`,

                        participantText
                            ? `**Participants**\n${participantText}`
                            : null,

                        messages.length === 0
                            ? "Aucun message pour le moment."
                            : messageLines.join(
                                "\n\n"
                            )
                    ])
            });

        const activeCall =
    PhoneV2Manager.getActiveCall(
        phone.id
    );

        const actionButtons = [
            UI.button.success({
                id:
                    `v2_phone_message_new:${conversation.id}:${characterId}`,

                label:
                    "Envoyer un SMS",

                emoji:
                    "✉️"
            }),

            UI.button.primary({
                id:
                    `v2_phone_mms_new:${conversation.id}:${characterId}`,

                label:
                    "Envoyer un MMS",

                emoji:
                    "🖼️"
            }),

            UI.button.secondary({
                id:
                    `v2_phone_email_new:${conversation.id}:${characterId}`,

                label:
                    "Envoyer un e-mail",

                emoji:
                    "📧"
            })
        ];

        if (conversation.conversation_type !== "group") {
            actionButtons.push(
                activeCall
                    ? UI.button.danger({
                        id:
                            `v2_phone_call_open:${activeCall.id}:${characterId}`,

                        label:
                            activeCall.status === "ringing"
                                ? "Appel en attente"
                                : "Appel en cours",

                        emoji:
                            activeCall.status === "ringing"
                                ? "🔔"
                                : "📵"
                    })
                    : UI.button.primary({
                        id:
                            `v2_phone_call_start:${conversation.id}:${characterId}`,

                        label:
                            "Appeler",

                        emoji:
                            "📞"
                    })
            );
        }

        actionButtons.push(
            UI.button.secondary({
                id:
                    `v2_phone_conversations:${characterId}`,

                label:
                    "Retour",

                emoji:
                    "⬅️"
            })
        );

        const actions =
            new ActionRowBuilder()
                .addComponents(actionButtons);

        return interaction.update(
            UI.page.create({
                embed,

                components: [
                    actions
                ]
            })
        );

    }

}

module.exports =
    new CharacterPhoneConversationPage();
