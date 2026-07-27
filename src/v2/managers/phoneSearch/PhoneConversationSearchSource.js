const phoneConversationManager =
    require(
        "../PhoneConversationV2Manager"
    );

const {
    calculateBestMatchScore,
    calculateRecencyBonus
} = require("./PhoneSearchUtils");

function search({
    viewerPhoneId,
    query,
    includeGroups,
    excludedPhoneIds
}) {
    const conversations =
        phoneConversationManager
            .getForPhone(
                viewerPhoneId
            );

    const results = [];

    for (
        const conversation
        of conversations
    ) {
        const isGroup =
            conversation
                .conversation_type ===
            "group";

        if (
            isGroup
            && !includeGroups
        ) {
            continue;
        }

        const participants =
            phoneConversationManager
                .getParticipants(
                    conversation.id
                );

        const otherParticipants =
            participants.filter(
                participant =>
                    Number(
                        participant.phone_id
                    ) !==
                    viewerPhoneId
            );

        if (!isGroup) {
            const otherParticipant =
                otherParticipants[0];

            if (!otherParticipant) {
                continue;
            }

            if (
                otherParticipant.phone_id
                && excludedPhoneIds.has(
                    Number(
                        otherParticipant
                            .phone_id
                    )
                )
            ) {
                continue;
            }
        }

        const title =
            phoneConversationManager
                .getDisplayName(
                    conversation,
                    viewerPhoneId
                );

        const searchableValues = [
            title,
            conversation.name,
            conversation
                .last_message_content
        ];

        for (
            const participant
            of otherParticipants
        ) {
            searchableValues.push(
                participant.character_name,
                participant.external_name,
                participant.phone_number,
                participant.external_phone
            );
        }

        const matchScore =
            calculateBestMatchScore(
                query,
                searchableValues
            );

        if (
            query
            && matchScore <= 0
        ) {
            continue;
        }

        const otherParticipant =
            isGroup
                ? null
                : otherParticipants[0];

        let score =
            matchScore + 25;

        if (
            Number(
                conversation.is_favorite
            ) === 1
        ) {
            score += 50;
        }

        if (
            Number(
                conversation.is_pinned
            ) === 1
        ) {
            score += 30;
        }

        if (
            Number(
                conversation.unread_count
            ) > 0
        ) {
            score += 15;
        }

        score +=
            calculateRecencyBonus(
                conversation
                    .last_message_created_at
                || conversation.updated_at
            );

        if (!query) {
            score += 40;
        }

        results.push({
            type:
                isGroup
                    ? "group"
                    : "recent",
            score,
            title,
            subtitle:
                isGroup
                    ? `${participants.length} participants`
                    : (
                        otherParticipant
                            ?.phone_number
                        || otherParticipant
                            ?.external_phone
                        || "Conversation récente"
                    ),
            avatar:
                isGroup
                    ? null
                    : (
                        otherParticipant
                            ?.character_avatar_url
                        || null
                    ),
            phoneId:
                !isGroup
                && otherParticipant
                    ?.phone_id
                    ? Number(
                        otherParticipant
                            .phone_id
                    )
                    : null,
            contactId:
                null,
            conversationId:
                Number(
                    conversation.id
                ),
            characterId:
                !isGroup
                && otherParticipant
                    ?.character_id
                    ? Number(
                        otherParticipant
                            .character_id
                    )
                    : null,
            continuityId:
                !isGroup
                && otherParticipant
                    ?.continuity_id
                    ? Number(
                        otherParticipant
                            .continuity_id
                    )
                    : null,
            phoneNumber:
                !isGroup
                    ? (
                        otherParticipant
                            ?.phone_number
                        || otherParticipant
                            ?.external_phone
                        || null
                    )
                    : null,
            contactType:
                isGroup
                    ? "group"
                    : (
                        otherParticipant
                            ?.participant_type
                        || "greycore"
                    ),
            favorite:
                Number(
                    conversation.is_favorite
                ) === 1,
            pinned:
                Number(
                    conversation.is_pinned
                ) === 1,
            blocked:
                false,
            external:
                !isGroup
                && !otherParticipant
                    ?.phone_id,
            group:
                isGroup,
            source:
                "conversations",
            unreadCount:
                Number(
                    conversation.unread_count
                ) || 0,
            lastMessage:
                conversation
                    .last_message_content
                || null,
            lastInteractionAt:
                conversation
                    .last_message_created_at
                || conversation.updated_at
                || null
        });
    }

    return results;
}

module.exports = {
    search
};
