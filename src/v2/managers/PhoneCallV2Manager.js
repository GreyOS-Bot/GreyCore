const reader =
    require(
        "./phoneCall/PhoneCallReader"
    );

const creationManager =
    require(
        "./phoneCall/PhoneCallCreationManager"
    );

const transitionManager =
    require(
        "./phoneCall/PhoneCallTransitionManager"
    );

const messageManager =
    require(
        "./phoneCall/PhoneCallMessageManager"
    );

class PhoneCallV2Manager {

    expireStaleRingingCalls(
        maximumAgeSeconds = 30
    ) {
        return transitionManager
            .expireStaleRingingCalls(
                maximumAgeSeconds
            );
    }

    getById(
        callId
    ) {
        return reader.getById(
            callId
        );
    }

    getActiveForPhone(
        phoneId
    ) {
        return reader
            .getActiveForPhone(
                phoneId
            );
    }

    getHistoryForPhone(
        phoneId,
        limit = 50
    ) {
        return reader
            .getHistoryForPhone(
                phoneId,
                limit
            );
    }

    createCall(
        data
    ) {
        return creationManager
            .createCall(
                data
            );
    }

    acceptCall(
        callId
    ) {
        return transitionManager
            .acceptCall(
                callId
            );
    }

    refuseCall(
        callId
    ) {
        return transitionManager
            .refuseCall(
                callId
            );
    }

    cancelCall(
        callId
    ) {
        return transitionManager
            .cancelCall(
                callId
            );
    }

    markMissed(
        callId
    ) {
        return transitionManager
            .markMissed(
                callId
            );
    }

    createMessage(
        data
    ) {
        return messageManager
            .createMessage(
                data
            );
    }

    getMessages(
        callId
    ) {
        return messageManager
            .getMessages(
                callId
            );
    }

    endCall(
        callId
    ) {
        return transitionManager
            .endCall(
                callId
            );
    }
}

module.exports =
    new PhoneCallV2Manager();
