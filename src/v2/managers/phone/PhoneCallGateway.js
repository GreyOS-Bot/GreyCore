const callManager =
    require(
        "../PhoneCallV2Manager"
    );

function getCallById(
    callId
) {
    return callManager.getById(
        callId
    );
}

function getActiveCall(
    phoneId
) {
    return callManager
        .getActiveForPhone(
            phoneId
        );
}

function getCallHistory(
    phoneId,
    limit = 50
) {
    return callManager
        .getHistoryForPhone(
            phoneId,
            limit
        );
}

function createCall(
    data
) {
    return callManager.createCall(
        data
    );
}

function acceptCall(
    callId
) {
    return callManager.acceptCall(
        callId
    );
}

function refuseCall(
    callId
) {
    return callManager.refuseCall(
        callId
    );
}

function cancelCall(
    callId
) {
    return callManager.cancelCall(
        callId
    );
}

function markMissed(
    callId
) {
    return callManager.markMissed(
        callId
    );
}

function endCall(
    callId
) {
    return callManager.endCall(
        callId
    );
}

function expireStaleRingingCalls(
    maximumAgeSeconds = 30
) {
    return callManager
        .expireStaleRingingCalls(
            maximumAgeSeconds
        );
}

module.exports = {
    getCallById,
    getActiveCall,
    getCallHistory,
    createCall,
    acceptCall,
    refuseCall,
    cancelCall,
    markMissed,
    endCall,
    expireStaleRingingCalls
};
