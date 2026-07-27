const repository =
    require(
        "../repositories/PhoneMessageRepository"
    );

class PhoneMessageV2Manager {

    create({
        conversationId,
        senderPhoneId,
        content,
        messageType = "text",
        mediaUrl = null,
        mediaContentType = null
    }) {
        return repository.create({
            conversationId,
            senderPhoneId,
            content,
            messageType,
            mediaUrl,
            mediaContentType,
            createdAt:
                new Date()
                    .toISOString()
        });
    }

    getById(
        messageId
    ) {
        return repository
            .getById(
                messageId
            );
    }

    getForConversation(
        conversationId,
        limit = 50
    ) {
        return repository
            .getForConversation(
                conversationId,
                limit
            )
            .reverse();
    }

    insert(
        data
    ) {
        return repository
            .insert(
                data
            );
    }

    updatePublication(
        messageId,
        data
    ) {
        return repository
            .updatePublication(
                messageId,
                data
            );
    }

    delete(
        messageId
    ) {
        const message =
            this.getById(
                messageId
            );

        if (!message) {
            throw new Error(
                "Message introuvable."
            );
        }

        repository.delete(
            messageId
        );

        return message;
    }

}

module.exports =
    new PhoneMessageV2Manager();
