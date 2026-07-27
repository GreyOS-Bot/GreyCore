const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class PhoneActionV2Manager {

    smsButtons(
        conversationId,
        receiverCharacterId
    ) {
        return new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `v2_phone_quick_reply:${conversationId}:${receiverCharacterId}`
                    )
                    .setLabel("Répondre")
                    .setEmoji("💬")
                    .setStyle(
                        ButtonStyle.Primary
                    ),

            );
    }

    incomingCallButtons(
    callId,
    receiverCharacterId
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `v2_phone_call_accept:${callId}:${receiverCharacterId}`
                )
                .setLabel(
                    "Décrocher"
                )
                .setEmoji(
                    "📞"
                )
                .setStyle(
                    ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(
                    `v2_phone_call_refuse:${callId}:${receiverCharacterId}`
                )
                .setLabel(
                    "Refuser"
                )
                .setEmoji(
                    "📵"
                )
                .setStyle(
                    ButtonStyle.Danger
                )

        );

}

}

module.exports =
    new PhoneActionV2Manager();