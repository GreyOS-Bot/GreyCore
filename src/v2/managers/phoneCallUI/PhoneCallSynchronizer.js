const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneCallSynchronizer"
    );

const sessionManager =
    require("../PhoneCallSessionManager");

const phoneManager =
    require("../PhoneV2Manager");

const sideUpdater =
    require("./PhoneCallSideUpdater");

async function refresh(
    callId
) {
    const session =
        sessionManager.get(
            callId
        );

    if (!session) {
        logger.warn(
            `[PhoneCallUIManager] Session introuvable pour l’appel ${callId}.`
        );

        return;
    }

    const call =
        phoneManager.getCallById(
            callId
        );

    if (!call) {
        logger.warn(
            `[PhoneCallUIManager] Appel introuvable : ${callId}.`
        );

        return;
    }

    const results =
        await Promise.allSettled([
            sideUpdater.refreshSide({
                target:
                    session
                        .callerInteraction,
                targetType:
                    "interaction",
                call,
                phoneId:
                    call.caller_phone_id,
                otherPhoneId:
                    call.receiver_phone_id,
                side:
                    "caller"
            }),
            sideUpdater.refreshSide({
                target:
                    session
                        .receiverMessage,
                targetType:
                    "message",
                call,
                phoneId:
                    call.receiver_phone_id,
                otherPhoneId:
                    call.caller_phone_id,
                side:
                    "receiver"
            })
        ]);

    for (
        const result
        of results
    ) {
        if (
            result.status ===
            "rejected"
        ) {
            logger.error(
                "[PhoneCallUIManager] Échec de synchronisation :",
                result.reason
            );
        }
    }

    if (
        [
            "ended",
            "refused",
            "cancelled",
            "missed"
        ].includes(
            call.status
        )
    ) {
        sessionManager.remove(
            call.id
        );
    }
}

module.exports = {
    refresh
};
