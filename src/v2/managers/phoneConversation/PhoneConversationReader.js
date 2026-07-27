const phoneMessageManager =
    require("../PhoneMessageV2Manager");

const repository =
    require(
        "./PhoneConversationRepository"
    );

function getForPhone(
    phoneId
) {
    const conversations =
        repository.getForPhone(
            phoneId
        );

    for (
        const conversation
        of conversations
    ) {
        conversation.other_character_name =
            getDisplayName(
                conversation,
                phoneId
            );
    }

    return conversations;
}

function getDisplayName(
    conversation,
    viewerPhoneId
) {
    if (
        conversation.conversation_type ===
        "group"
    ) {
        if (
            conversation.name?.trim()
        ) {
            return conversation
                .name
                .trim();
        }

        const names =
            repository
                .getParticipants(
                    conversation.id
                )
                .filter(
                    participant =>
                        Number(
                            participant.phone_id
                        ) !==
                        Number(
                            viewerPhoneId
                        )
                )
                .map(
                    participant =>
                        participant
                            .character_name
                        || participant
                            .external_name
                        || participant
                            .phone_number
                        || participant
                            .external_phone
                        || "Inconnu"
                );

        return names
            .slice(0, 4)
            .join(", ")
            || "Groupe";
    }

    const otherParticipant =
        repository
            .getParticipants(
                conversation.id
            )
            .find(
                participant =>
                    Number(
                        participant.phone_id
                    ) !==
                    Number(
                        viewerPhoneId
                    )
            );

    return otherParticipant
        ?.character_name
        || otherParticipant
            ?.external_name
        || otherParticipant
            ?.phone_number
        || otherParticipant
            ?.external_phone
        || "Contact inconnu";
}

function getOtherParticipant(
    conversationId,
    phoneId
) {
    return repository
        .getParticipants(
            conversationId
        )
        .find(
            participant =>
                Number(
                    participant.phone_id
                ) !==
                Number(phoneId)
        )
        || null;
}

function getMessages(
    conversationId,
    limit = 50
) {
    return phoneMessageManager
        .getForConversation(
            conversationId,
            limit
        );
}

module.exports = {
    getForPhone,
    getDisplayName,
    getOtherParticipant,
    getMessages
};
