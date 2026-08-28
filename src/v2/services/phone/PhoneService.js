const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const PhoneConversationV2Manager =
    require("../../managers/PhoneConversationV2Manager");

const webhookManager =
    require("../../../webhooks/webhookManager");

const {
    getThreadId
} = require(
    "../../core/services/ProxyThreadContext"
);

const PhoneActionV2Manager =
    require(
        "../../managers/PhoneActionV2Manager"
    );

const PhoneNotificationService =
    require(
        "./PhoneNotificationService"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneService"
    );

class PhoneService {

    getCharacterDisplayName(
        character
    ) {
        return String(
            character?.display_name
            || character?.displayName
            || character?.proxy_name
            || character?.name
            || "Personnage"
        ).trim();
    }

    formatSmsContent(
        receiverName,
        content,
        isGroup = false,
        isMms = false,
        isEmail = false,
        subject = null,
        isVoicemail = false
    ) {
        if (isEmail) {
            return [
                `📧 **E-mail à ${receiverName}**`,
                `**Objet :** ${subject}`,
                "",
                content
            ].join("\n");
        }
        return [
            `${
                isMms
                    ? "🖼️"
                    : isVoicemail
                        ? "📼"
                    : "📱"
            } **${
                isMms
                    ? "MMS"
                    : isVoicemail
                        ? "Message vocal"
                    : "SMS"
            } ${
                isGroup
                    ? "dans"
                    : "à"
            } ${receiverName}**`,
            "",
            content || "🖼️ Image"
        ].join("\n");
    }

    async sendSms(data) {

        const {
            client,
            guildId,
            channel,
            senderCharacter,
            senderPhone,
            conversationId,
            content,
            messageType = "text",
            mediaUrl = null,
            mediaContentType = null,
            mediaName = null,
            subject = null
        } = data;

        if (
            !channel ||
            !channel.isTextBased()
        ) {
            throw new Error(
                "Le salon actuel ne permet pas l’envoi de SMS."
            );
        }

        const cleanContent =
            String(content || "")
                .trim();

        const isMms =
            messageType === "mms";
        const isEmail =
            messageType === "email";

        const isVoicemail =
            messageType === "voicemail";

        const cleanSubject =
            String(subject || "").trim();

        const cleanMediaUrl =
            String(mediaUrl || "")
                .trim();

        if (!cleanContent && !isMms) {
            throw new Error(
                "Le SMS ne peut pas être vide."
            );
        }
        if (isEmail && !cleanSubject) {
            throw new Error("L’objet de l’e-mail ne peut pas être vide.");
        }

        if (
            isMms
            && (
                !cleanMediaUrl
                || !String(mediaContentType || "")
                    .startsWith("image/")
            )
        ) {
            throw new Error(
                "Le MMS doit contenir une image ou un GIF."
            );
        }

        const conversation =
            PhoneV2Manager
                .getConversationById(
                    conversationId
                );

        if (!conversation) {
            throw new Error(
                "Conversation introuvable."
            );
        }

        const participants =
            PhoneConversationV2Manager
                .getParticipants(
                    conversationId
                );

        const senderParticipant =
            participants.find(
                participant =>
                    Number(
                        participant.phone_id
                    ) ===
                    Number(
                        senderPhone.id
                    )
            );

        if (!senderParticipant) {
            throw new Error(
                "Ce téléphone ne participe pas à cette conversation."
            );
        }

        const receiverParticipants =
            participants.filter(
                participant =>
                    Number(
                        participant.phone_id
                    ) !==
                    Number(
                        senderPhone.id
                    )
            );

        if (receiverParticipants.length === 0) {
            throw new Error(
                "Destinataire introuvable."
            );
        }

        const receiverParticipant =
            receiverParticipants[0];

        const isGroup =
            conversation.conversation_type ===
            "group";

        const receiverName =
            isGroup
                ? PhoneConversationV2Manager
                    .getDisplayName(
                        conversation,
                        senderPhone.id
                    )
                : receiverParticipant
                    .character_name
                || receiverParticipant
                    .external_name
                || receiverParticipant
                    .phone_number
                || receiverParticipant
                    .external_phone
                || "Inconnu";

        const message =
            PhoneV2Manager
                .createMessage({
                    conversationId,
                    senderPhoneId:
                        senderPhone.id,
                    content:
                        cleanContent,
                    messageType:
                        isMms
                            ? "mms"
                            : isEmail
                                ? "email"
                                : isVoicemail
                                    ? "voicemail"
                                    : "text",
                    subject: isEmail ? cleanSubject : null,
                    mediaUrl:
                        isMms
                            ? cleanMediaUrl
                            : null,
                    mediaContentType:
                        isMms
                            ? mediaContentType
                            : null
                });

        let webhook;
        let webhookMessage;

        try {

            const sent =
                await webhookManager
                    .sendWithWebhook(
                        channel,
                        {
                    content:
                        this.formatSmsContent(
                            receiverName,
                            cleanContent,
                            isGroup,
                            isMms,
                            isEmail,
                            cleanSubject,
                            isVoicemail
                        ),

                    username:
                        this.getCharacterDisplayName(
                            senderCharacter
                        ),

                    avatarURL:
                        senderCharacter
                            .avatar_url
                        || null,

                    files:
                        isMms
                            ? [
                                {
                                    attachment:
                                        cleanMediaUrl,
                                    name:
                                        mediaName
                                        || this.getMmsFilename(
                                            mediaContentType
                                        )
                                }
                            ]
                            : [],

                    components: isGroup
                        ? [PhoneActionV2Manager.groupReplyButtons(conversation.id)]
                        : receiverParticipant.character_id
                            ? [
                                PhoneActionV2Manager
                                    .smsButtons(
                                        conversation.id,
                                        receiverParticipant
                                            .character_id,
                                        isEmail
                                            ? "email"
                                            : "text"
                                    )
                            ]
                            : [],

                            allowedMentions: {
                                parse: []
                            }
                        }
                    );

            webhook = sent.webhook;
            webhookMessage =
                sent.webhookMessage;

            const publishedMessage =
                PhoneV2Manager
                    .updateMessagePublication(
                        message.id,
                        {
                            publicGuildId:
                                guildId,

                            publicChannelId:
                                channel.id,

                            webhookMessageId:
                                webhookMessage.id,

                            mediaUrl:
                                isMms
                                    ? webhookMessage
                                        .attachments
                                        ?.first?.()
                                        ?.url
                                    || cleanMediaUrl
                                    : null
                        }
                    );

            /*
             * Une erreur de notification ne doit
             * jamais annuler un SMS déjà envoyé.
             */
            if (client) {
                for (
                    const targetParticipant
                    of receiverParticipants
                ) {
                    if (!targetParticipant.character_id) {
                        continue;
                    }

                    await PhoneNotificationService
                        .notifyNewSms({
                            client,
                            receiverParticipant:
                                targetParticipant,
                            senderCharacter,
                            content:
                                cleanContent
                                || "🖼️ MMS",
                            messageType:
                                isMms
                                    ? "mms"
                                    : isEmail
                                        ? "email"
                                        : isVoicemail
                                            ? "voicemail"
                                            : "text",
                            conversationName:
                                isGroup
                                    ? receiverName
                                    : null,
                            publicGuildId:
                                guildId,
                            publicChannelId:
                                channel.id,
                            webhookMessageId:
                                webhookMessage.id
                        })
                        .catch(error => {
                            logger.warn(
                                "Notification SMS impossible.",
                                error
                            );
                        });
                }
            }

            return {
                conversation,
                message:
                    publishedMessage,
                webhookMessage,
                receiverParticipant,
                receiverParticipants
            };

        } catch (error) {

            PhoneV2Manager
                .deleteMessage(
                    message.id
                );

            if (
                webhook &&
                webhookMessage
            ) {
                await webhook
                    .deleteMessage(
                        webhookMessage.id,
                        getThreadId(channel)
                        || undefined
                    )
                    .catch(
                        () => null
                    );
            }

            throw error;

        }

    }

    async sendMms(data) {
        return this.sendSms({
            ...data,
            messageType:
                "mms"
        });
    }

    async sendEmail(data) {
        return this.sendSms({
            ...data,
            messageType: "email"
        });
    }

    async sendVoicemail(data) {
        return this.sendSms({
            ...data,
            messageType: "voicemail"
        });
    }

    getMmsFilename(contentType) {
        if (contentType === "image/gif") {
            return "mms.gif";
        }

        if (contentType === "image/jpeg") {
            return "mms.jpg";
        }

        if (contentType === "image/webp") {
            return "mms.webp";
        }

        return "mms.png";
    }

}

module.exports =
    new PhoneService();
