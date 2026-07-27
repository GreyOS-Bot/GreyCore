const repository =
    require(
        "./PhoneCallRepository"
    );

function createMessage(
    data
) {
    const content =
        data.content?.trim();

    if (!content) {
        throw new Error(
            "Le message ne peut pas être vide."
        );
    }

    const messageId =
        repository.insertMessage({
            callId:
                data.callId,
            speakerPhoneId:
                data.speakerPhoneId,
            content,
            createdAt:
                new Date().toISOString()
        });

    return repository.getMessageById(
        messageId
    );
}

function getMessages(
    callId
) {
    return repository.getMessages(
        callId
    );
}

module.exports = {
    createMessage,
    getMessages
};
