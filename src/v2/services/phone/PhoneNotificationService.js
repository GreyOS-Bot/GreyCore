const CharacterV2Manager =
    require("../../managers/CharacterV2Manager");

const PhoneActionV2Manager =
    require(
        "../../managers/PhoneActionV2Manager"
    );

const PhoneCallSessionManager =
    require(
        "../../managers/PhoneCallSessionManager"
    );

class PhoneNotificationService {

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

    async getCharacterUser(
        client,
        characterId
    ) {

        if (
            !client
            ||
            !characterId
        ) {
            return null;
        }

        const character =
            CharacterV2Manager.getById(
                characterId
            );

        if (
            !character
            ||
            !character.discord_user_id
        ) {
            return null;
        }

        const user =
            await client.users
                .fetch(
                    character.discord_user_id
                )
                .catch(() => null);

        if (!user) {
            return null;
        }

        return {
            character,
            user
        };

    }

    async notifyNewSms({
        client,
        receiverParticipant,
        senderCharacter,
        content,
        messageType = "text",
        conversationName = null,
        publicGuildId = null,
        publicChannelId = null,
        webhookMessageId = null
    }) {

        if (
            !receiverParticipant
                ?.character_id
        ) {
            return null;
        }

        const target =
            await this.getCharacterUser(
                client,
                receiverParticipant
                    .character_id
            );

        if (!target) {
            return null;
        }

        const messageLink =
            this.buildMessageLink({
                publicGuildId,
                publicChannelId,
                webhookMessageId
            });

        const isMms =
            messageType === "mms";
        const isEmail =
            messageType === "email";
        const isVoicemail =
            messageType === "voicemail";

        const label =
            isMms
                ? "MMS"
                : isEmail
                    ? "e-mail"
                    : isVoicemail
                        ? "message vocal"
                        : "SMS";

        return target.user.send({
            content: [
                `${
                    isEmail
                        ? "📧"
                        : isVoicemail
                            ? "📼"
                            : "📱"
                } **Nouveau ${label}**`,
                "",
                `**${this.getCharacterDisplayName(senderCharacter)}** vous a envoyé un message${
                    conversationName
                        ? ` dans **${conversationName}**`
                        : ""
                }.`,
                "",
                `> ${content}`,
                messageLink
                    ? ""
                    : null,
                messageLink
                    ? `🔗 [Ouvrir le ${label} dans le salon](${messageLink})`
                    : null
            ]
                .filter(Boolean)
                .join("\n")
        }).catch(() => null);

    }

    buildMessageLink({
        publicGuildId,
        publicChannelId,
        webhookMessageId
    }) {
        if (
            !publicGuildId
            || !publicChannelId
            || !webhookMessageId
        ) {
            return null;
        }

        return [
            "https://discord.com/channels",
            publicGuildId,
            publicChannelId,
            webhookMessageId
        ].join("/");
    }

    async notifyIncomingCall({
        client,
        call,
        receiverParticipant,
        senderCharacter
    }) {

        if (
            !call
            ||
            !receiverParticipant
                ?.character_id
        ) {
            return null;
        }

        const target =
            await this.getCharacterUser(
                client,
                receiverParticipant
                    .character_id
            );

        if (!target) {
            return null;
        }

        const receiverMessage =
    await target.user.send({
        content: [
            "📞 **Appel entrant**",
            "",
            `**${this.getCharacterDisplayName(senderCharacter)}** vous appelle.`,
            "",
            "Que souhaitez-vous faire ?"
        ].join("\n"),

        components: [
            PhoneActionV2Manager
                .incomingCallButtons(
                    call.id,
                    receiverParticipant
                        .character_id
                )
        ]
    }).catch(() => null);

if (!receiverMessage) {
    return null;
}

PhoneCallSessionManager.register(
    call.id,
    {
        receiverMessage
    }
);

return receiverMessage;

    }

}

module.exports =
    new PhoneNotificationService();
