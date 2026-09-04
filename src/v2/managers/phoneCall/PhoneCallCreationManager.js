const repository =
    require(
        "./PhoneCallRepository"
    );

const RINGING_CALL_MAXIMUM_AGE_SECONDS = 12 * 60 * 60;

function createCall(
    data
) {
    const createdAt =
        new Date().toISOString();

    const callerPhoneId =
        Number(
            data.callerPhoneId
        );

    const receiverPhoneId =
        Number(
            data.receiverPhoneId
        );

    if (
        !Number.isInteger(
            callerPhoneId
        )
        || !Number.isInteger(
            receiverPhoneId
        )
    ) {
        throw new Error(
            "Les identifiants des téléphones sont invalides."
        );
    }

    if (
        callerPhoneId ===
        receiverPhoneId
    ) {
        throw new Error(
            "Un téléphone ne peut pas s'appeler lui-même."
        );
    }

    const caller =
        repository.getPhoneById(
            callerPhoneId
        );

    const receiver =
        repository.getPhoneById(
            receiverPhoneId
        );

    if (!caller) {
        throw new Error(
            "Téléphone appelant introuvable."
        );
    }

    if (!receiver) {
        throw new Error(
            "Téléphone destinataire introuvable."
        );
    }

    if (!caller.is_active) {
        throw new Error(
            "Le téléphone appelant est désactivé."
        );
    }

    if (!receiver.is_active) {
        throw new Error(
            "Le téléphone destinataire est désactivé."
        );
    }

    repository.expireStaleRingingCalls({
        endedAt: createdAt,
        limitDate: new Date(
            Date.parse(createdAt)
            - RINGING_CALL_MAXIMUM_AGE_SECONDS * 1000
        ).toISOString()
    });

    if (
        repository.getActiveForPhone(
            callerPhoneId
        )
    ) {
        throw new Error(
            "Le téléphone appelant est déjà en communication."
        );
    }

    if (
        repository.getActiveForPhone(
            receiverPhoneId
        )
    ) {
        throw new Error(
            "Le téléphone destinataire est déjà en communication."
        );
    }

    const callId =
        repository.insertCall({
            callerPhoneId,
            receiverPhoneId,
            createdAt
        });

    return repository.getById(
        callId
    );
}

module.exports = {
    createCall
};
