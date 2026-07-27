const repository =
    require(
        "./PhoneCallRepository"
    );

function getById(
    callId
) {
    return repository.getById(
        callId
    );
}

function getActiveForPhone(
    phoneId
) {
    return repository
        .getActiveForPhone(
            phoneId
        );
}

function getHistoryForPhone(
    phoneId,
    limit = 50
) {
    return repository
        .getHistoryForPhone(
            phoneId,
            limit
        );
}

module.exports = {
    getById,
    getActiveForPhone,
    getHistoryForPhone
};
