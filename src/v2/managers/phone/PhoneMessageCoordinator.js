const messageManager =
    require(
        "../PhoneMessageV2Manager"
    );

const conversationManager =
    require(
        "../PhoneConversationV2Manager"
    );

const repository =
    require("./PhoneRepository");

function getMessageById(
    messageId
) {
    return messageManager.getById(
        messageId
    );
}

function getForConversation(
    conversationId,
    limit = 50
) {
    return messageManager
        .getForConversation(
            conversationId,
            limit
        );
}

function deleteMessage(
    messageId
) {
    return messageManager.delete(
        messageId
    );
}

function createMessage(
    data
) {
    const conversation =
        conversationManager.getById(
            data.conversationId
        );

    if (!conversation) {
        throw new Error(
            "Conversation introuvable."
        );
    }

    const senderPhone =
        repository.getPhoneById(
            data.senderPhoneId
        );

    if (!senderPhone) {
        throw new Error(
            "Téléphone expéditeur introuvable."
        );
    }

    const isParticipant =
        typeof conversationManager
            .isParticipant === "function"
            ? conversationManager.isParticipant(
                data.conversationId,
                senderPhone.id
            )
            : senderPhone.id ===
                conversation.phone_a_id
            || senderPhone.id ===
                conversation.phone_b_id;

    if (!isParticipant) {
        throw new Error(
            "Ce téléphone n’appartient pas à cette conversation."
        );
    }

    const content =
        String(data.content || "")
            .trim();

    const mediaUrl =
        String(data.mediaUrl || "")
            .trim()
        || null;

    if (!content && !mediaUrl) {
        throw new Error(
            "Le message ne peut pas être vide."
        );
    }

    const now =
        data.createdAt
        || new Date().toISOString();

    const message =
        messageManager.insert({
            conversationId:
                data.conversationId,
            senderPhoneId:
                data.senderPhoneId,
            content,
            subject:
                String(data.subject || "").trim() || null,
            messageType:
                data.messageType || "text",
            mediaUrl,
            mediaContentType:
                data.mediaContentType || null,
            publicGuildId:
                data.publicGuildId,
            publicChannelId:
                data.publicChannelId,
            webhookMessageId:
                data.webhookMessageId,
            createdAt:
                now
        });

    repository.touchConversation(
        data.conversationId,
        now
    );

    return message;
}

function updateMessagePublication(
    messageId,
    data
) {
    return messageManager
        .updatePublication(
            messageId,
            data
        );
}

module.exports = {
    getMessageById,
    getForConversation,
    deleteMessage,
    createMessage,
    updateMessagePublication
};
