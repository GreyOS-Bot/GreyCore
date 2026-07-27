const repository =
    require(
        "./phone/PhoneRepository"
    );

const lifecycleManager =
    require(
        "./phone/PhoneLifecycleManager"
    );

const conversationGateway =
    require(
        "./phone/PhoneConversationGateway"
    );

const messageCoordinator =
    require(
        "./phone/PhoneMessageCoordinator"
    );

const callGateway =
    require(
        "./phone/PhoneCallGateway"
    );

class PhoneV2Manager {

    getPhoneById(
        phoneId
    ) {
        return repository.getPhoneById(
            phoneId
        );
    }

    getPhoneByContinuity(
        continuityId
    ) {
        return repository
            .getPhoneByContinuity(
                continuityId
            );
    }

    getContinuityByPhone(
        phoneId
    ) {
        return repository
            .getContinuityByPhone(
                phoneId
            );
    }

    getPhoneByNumber(
        phoneNumber
    ) {
        return repository
            .getPhoneByNumber(
                phoneNumber
            );
    }

    generatePhoneNumber() {
        return lifecycleManager
            .generatePhoneNumber();
    }

    createPhone(
        data
    ) {
        return lifecycleManager
            .createPhone(
                data
            );
    }

    setActive(
        phoneId,
        isActive
    ) {
        return lifecycleManager
            .setActive(
                phoneId,
                isActive
            );
    }

    getConversationById(
        conversationId
    ) {
        return conversationGateway
            .getConversationById(
                conversationId
            );
    }

    getConversationBetweenPhones(
        phoneAId,
        phoneBId
    ) {
        return conversationGateway
            .getConversationBetweenPhones(
                phoneAId,
                phoneBId
            );
    }

    getOrCreateConversation(
        phoneAId,
        phoneBId
    ) {
        return conversationGateway
            .getOrCreateConversation(
                phoneAId,
                phoneBId
            );
    }

    getConversationsForPhone(
        phoneId
    ) {
        return conversationGateway
            .getConversationsForPhone(
                phoneId
            );
    }

    getMessages(
        conversationId,
        limit = 50
    ) {
        return conversationGateway
            .getMessages(
                conversationId,
                limit
            );
    }

    getMessageById(
        messageId
    ) {
        return messageCoordinator
            .getMessageById(
                messageId
            );
    }

    getForConversation(
        conversationId,
        limit = 50
    ) {
        return messageCoordinator
            .getForConversation(
                conversationId,
                limit
            );
    }

    deleteMessage(
        messageId
    ) {
        return messageCoordinator
            .deleteMessage(
                messageId
            );
    }

    createMessage(
        data
    ) {
        return messageCoordinator
            .createMessage(
                data
            );
    }

    updateMessagePublication(
        messageId,
        data
    ) {
        return messageCoordinator
            .updateMessagePublication(
                messageId,
                data
            );
    }

    getCallById(
        callId
    ) {
        return callGateway.getCallById(
            callId
        );
    }

    getActiveCall(
        phoneId
    ) {
        return callGateway.getActiveCall(
            phoneId
        );
    }

    getCallHistory(
        phoneId,
        limit = 50
    ) {
        return callGateway
            .getCallHistory(
                phoneId,
                limit
            );
    }

    createCall(
        data
    ) {
        return callGateway.createCall(
            data
        );
    }

    acceptCall(
        callId
    ) {
        return callGateway.acceptCall(
            callId
        );
    }

    refuseCall(
        callId
    ) {
        return callGateway.refuseCall(
            callId
        );
    }

    cancelCall(
        callId
    ) {
        return callGateway.cancelCall(
            callId
        );
    }

    markMissed(
        callId
    ) {
        return callGateway.markMissed(
            callId
        );
    }

    endCall(
        callId
    ) {
        return callGateway.endCall(
            callId
        );
    }

    expireStaleRingingCalls(
        maximumAgeSeconds = 30
    ) {
        return callGateway
            .expireStaleRingingCalls(
                maximumAgeSeconds
            );
    }
}

module.exports =
    new PhoneV2Manager();
