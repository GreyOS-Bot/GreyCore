const pendingActionManager =
    require(
        "../../../../v2/managers/PendingActionManager"
    );

const characterManager =
    require(
        "../../../../v2/managers/CharacterV2Manager"
    );

const dashboardManager =
    require(
        "../../../../v2/services/dashboard/CharacterDashboardManager"
    );

const phoneManager =
    require(
        "../../../../v2/managers/PhoneV2Manager"
    );

const conversationManager =
    require(
        "../../../../v2/managers/PhoneConversationV2Manager"
    );

const phoneService =
    require(
        "../../../../v2/services/phone/PhoneService"
    );

const {
    getImageAttachment
} = require("./ImageAttachment");

module.exports =
    async function phoneMmsUploadHandler(
        message,
        pendingAction
    ) {
        const attachment =
            await getImageAttachment(
                message,
                {
                    missingMessage:
                        "❌ Envoie une image ou un GIF pour créer le MMS.",
                    invalidMessage:
                        "❌ Le fichier envoyé doit être une image ou un GIF."
                }
            );

        if (!attachment) {
            return;
        }

        const character =
            characterManager.getById(
                pendingAction.characterId
            );

        const dashboardData =
            character
                ? dashboardManager
                    .getPlayableDashboardData(
                        character.id,
                        {
                            guildId:
                                message.guild?.id
                        }
                    )
                : null;

        const phone =
            dashboardData?.continuity
                ? phoneManager
                    .getPhoneByContinuity(
                        dashboardData.continuity.id
                    )
                : null;

        const conversation =
            phoneManager.getConversationById(
                pendingAction.conversationId
            );

        if (
            !character
            || !dashboardData
            || !phone
            || !conversation
            || String(character.discord_user_id) !==
                String(message.author.id)
            || dashboardData.continuity.id !==
                pendingAction.continuityId
            || !conversationManager.isParticipant(
                conversation.id,
                phone.id
            )
        ) {
            pendingActionManager.delete(
                message.author.id
            );

            await message.reply(
                "❌ Cette demande de MMS est introuvable ou ne t’appartient plus."
            );

            return;
        }

        try {
            await phoneService.sendMms({
                client:
                    message.client,
                guildId:
                    message.guild.id,
                channel:
                    message.channel,
                senderCharacter:
                    character,
                senderPhone:
                    phone,
                conversationId:
                    conversation.id,
                content:
                    message.content,
                mediaUrl:
                    attachment.url,
                mediaContentType:
                    attachment.contentType,
                mediaName:
                    attachment.name
            });

            pendingActionManager.delete(
                message.author.id
            );

            await message.reply(
                "✅ MMS envoyé."
            );
        } catch (error) {
            await message.reply(
                `❌ ${
                    error.message
                    || "Impossible d’envoyer ce MMS."
                }`
            );
        }
    };
