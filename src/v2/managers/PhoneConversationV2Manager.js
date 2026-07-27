const repository =
    require(
        "./phoneConversation/PhoneConversationRepository"
    );

const creationManager =
    require(
        "./phoneConversation/PhoneConversationCreationManager"
    );

const participantManager =
    require(
        "./phoneConversation/PhoneConversationParticipantManager"
    );

const reader =
    require(
        "./phoneConversation/PhoneConversationReader"
    );

class PhoneConversationV2Manager {

    getById(
        conversationId
    ) {
        return repository.getById(
            conversationId
        );
    }

    getParticipantById(
        participantId
    ) {
        return repository
            .getParticipantById(
                participantId
            );
    }

    getParticipants(
        conversationId
    ) {
        return repository
            .getParticipants(
                conversationId
            );
    }

    getParticipant(
        conversationId,
        phoneId
    ) {
        return repository
            .getParticipant(
                conversationId,
                phoneId
            );
    }

    isParticipant(
        conversationId,
        phoneId
    ) {
        return Boolean(
            this.getParticipant(
                conversationId,
                phoneId
            )
        );
    }

    getPrivateBetweenPhones(
        phoneAId,
        phoneBId
    ) {
        const orderedPhoneA =
            Math.min(
                phoneAId,
                phoneBId
            );

        const orderedPhoneB =
            Math.max(
                phoneAId,
                phoneBId
            );

        return repository
            .getPrivateBetweenPhones(
                orderedPhoneA,
                orderedPhoneB
            );
    }

    createPrivate(
        phoneAId,
        phoneBId
    ) {
        return creationManager
            .createPrivate(
                phoneAId,
                phoneBId
            );
    }

    createGroup(
        data
    ) {
        return creationManager
            .createGroup(
                data
            );
    }

    addGreycoreParticipant(
        conversationId,
        phoneId,
        options = {}
    ) {
        return participantManager
            .addGreycoreParticipant(
                conversationId,
                phoneId,
                options
            );
    }

    addExternalParticipant(
        conversationId,
        data,
        options = {}
    ) {
        return participantManager
            .addExternalParticipant(
                conversationId,
                data,
                options
            );
    }

    removeParticipant(
        conversationId,
        participantId
    ) {
        return participantManager
            .removeParticipant(
                conversationId,
                participantId
            );
    }

    rename(
        conversationId,
        name
    ) {
        return creationManager.rename(
            conversationId,
            name
        );
    }

    getForPhone(
        phoneId
    ) {
        return reader.getForPhone(
            phoneId
        );
    }

    getDisplayName(
        conversation,
        viewerPhoneId
    ) {
        return reader.getDisplayName(
            conversation,
            viewerPhoneId
        );
    }

    getOtherParticipant(
        conversationId,
        phoneId
    ) {
        return reader
            .getOtherParticipant(
                conversationId,
                phoneId
            );
    }

    ensureLegacyParticipants(
        conversationId
    ) {
        return participantManager
            .ensureLegacyParticipants(
                conversationId
            );
    }

    touch(
        conversationId
    ) {
        return repository.touch(
            conversationId
        );
    }

    getMessages(
        conversationId,
        limit = 50
    ) {
        return reader.getMessages(
            conversationId,
            limit
        );
    }
}

module.exports =
    new PhoneConversationV2Manager();
