const conversationManager =
    require(
        "../PhoneConversationV2Manager"
    );

const phoneContactManager =
    require("../PhoneContactV2Manager");

function getConversationById(
    conversationId
) {
    return conversationManager.getById(
        conversationId
    );
}

function getConversationBetweenPhones(
    phoneAId,
    phoneBId
) {
    return conversationManager
        .getPrivateBetweenPhones(
            phoneAId,
            phoneBId
        );
}

function getOrCreateConversation(
    phoneAId,
    phoneBId
) {
    const conversation =
        conversationManager
        .createPrivate(
            phoneAId,
            phoneBId
        );

    /*
     * Démarrer une conversation privée revient à communiquer son
     * numéro : chacun reçoit l’autre dans son répertoire. La méthode
     * est idempotente et rafraîchit les données GreyCore existantes.
     */
    phoneContactManager
        .ensureMutualGreycoreContacts(
            phoneAId,
            phoneBId
        );

    return conversation;
}

function getConversationsForPhone(
    phoneId
) {
    return conversationManager
        .getForPhone(
            phoneId
        );
}

function getMessages(
    conversationId,
    limit = 50
) {
    return conversationManager
        .getMessages(
            conversationId,
            limit
        );
}

module.exports = {
    getConversationById,
    getConversationBetweenPhones,
    getOrCreateConversation,
    getConversationsForPhone,
    getMessages
};
