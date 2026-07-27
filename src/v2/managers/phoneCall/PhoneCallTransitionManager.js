const repository =
    require(
        "./PhoneCallRepository"
    );

function expireStaleRingingCalls(
    maximumAgeSeconds = 30
) {
    const limitDate =
        new Date(
            Date.now()
            - maximumAgeSeconds * 1000
        ).toISOString();

    return repository
        .expireStaleRingingCalls({
            endedAt:
                new Date().toISOString(),
            limitDate
        });
}

function acceptCall(
    callId
) {
    return transition({
        callId,
        expectedStatus:
            "ringing",
        nextStatus:
            "accepted",
        timestampField:
            "answered_at",
        invalidStatusMessage:
            "Cet appel ne peut plus être accepté.",
        conflictMessage:
            "Cet appel a déjà été traité."
    });
}

function refuseCall(
    callId
) {
    return transition({
        callId,
        expectedStatus:
            "ringing",
        nextStatus:
            "refused",
        timestampField:
            "ended_at",
        invalidStatusMessage:
            "Cet appel ne peut plus être refusé.",
        conflictMessage:
            "Cet appel a déjà été traité."
    });
}

function cancelCall(
    callId
) {
    return transition({
        callId,
        expectedStatus:
            "ringing",
        nextStatus:
            "cancelled",
        timestampField:
            "ended_at",
        invalidStatusMessage:
            "Cet appel ne peut plus être annulé.",
        conflictMessage:
            "Cet appel a déjà été traité."
    });
}

function markMissed(
    callId
) {
    return transition({
        callId,
        expectedStatus:
            "ringing",
        nextStatus:
            "missed",
        timestampField:
            "ended_at",
        updateTimestamp:
            true,
        invalidStatusMessage:
            "Cet appel ne peut pas être marqué comme manqué.",
        conflictMessage:
            "Cet appel a déjà été traité."
    });
}

function endCall(
    callId
) {
    return transition({
        callId,
        expectedStatus:
            "accepted",
        nextStatus:
            "ended",
        timestampField:
            "ended_at",
        invalidStatusMessage:
            "Seul un appel en cours peut être terminé.",
        conflictMessage:
            "Cet appel a déjà été terminé."
    });
}

function transition({
    callId,
    expectedStatus,
    nextStatus,
    timestampField,
    updateTimestamp = false,
    invalidStatusMessage,
    conflictMessage
}) {
    const call =
        repository.getById(
            callId
        );

    if (!call) {
        throw new Error(
            "Appel introuvable."
        );
    }

    if (
        call.status !==
        expectedStatus
    ) {
        throw new Error(
            invalidStatusMessage
        );
    }

    const changes =
        repository.transitionCall({
            callId,
            expectedStatus,
            nextStatus,
            occurredAt:
                new Date().toISOString(),
            timestampField,
            updateTimestamp
        });

    if (!changes) {
        throw new Error(
            conflictMessage
        );
    }

    return repository.getById(
        callId
    );
}

module.exports = {
    expireStaleRingingCalls,
    acceptCall,
    refuseCall,
    cancelCall,
    markMissed,
    endCall
};
