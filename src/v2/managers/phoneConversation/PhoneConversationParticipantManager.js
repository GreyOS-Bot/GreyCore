const repository =
    require(
        "./PhoneConversationRepository"
    );

function addGreycoreParticipant(
    conversationId,
    phoneId,
    options = {}
) {
    const conversation =
        repository.getById(
            conversationId
        );

    if (!conversation) {
        throw new Error(
            "Conversation introuvable."
        );
    }

    const phone =
        repository.getPhoneById(
            phoneId
        );

    if (!phone) {
        throw new Error(
            "Téléphone du participant introuvable."
        );
    }

    const existing =
        repository
            .findGreycoreParticipant(
                conversationId,
                phoneId
            );

    const now =
        options.joinedAt
        || new Date().toISOString();

    if (existing) {
        const isAdmin =
            options.isAdmin ===
            undefined
                ? existing.is_admin
                : options.isAdmin
                    ? 1
                    : 0;

        repository
            .restoreGreycoreParticipant({
                participantId:
                    existing.id,
                isAdmin,
                joinedAt:
                    now
            });

        repository.touch(
            conversationId
        );

        return repository
            .getParticipantById(
                existing.id
            );
    }

    const participantId =
        repository
            .insertGreycoreParticipant({
                conversationId,
                phoneId,
                isAdmin:
                    options.isAdmin
                        ? 1
                        : 0,
                joinedAt:
                    now
            });

    repository.touch(
        conversationId
    );

    return repository
        .getParticipantById(
            participantId
        );
}

function addExternalParticipant(
    conversationId,
    data,
    options = {}
) {
    const conversation =
        repository.getById(
            conversationId
        );

    if (!conversation) {
        throw new Error(
            "Conversation introuvable."
        );
    }

    const externalName =
        data.name?.trim()
        || null;

    const externalPhone =
        data.phoneNumber?.trim()
        || null;

    if (
        !externalName
        && !externalPhone
    ) {
        throw new Error(
            "Le participant externe doit avoir un nom ou un numéro."
        );
    }

    const allowedTypes = [
        "external",
        "plural",
        "tupperbox",
        "npc"
    ];

    const participantType =
        allowedTypes.includes(
            data.type
        )
            ? data.type
            : "external";

    const existing =
        repository
            .findExternalParticipant({
                conversationId,
                externalName,
                externalPhone
            });

    const now =
        options.joinedAt
        || new Date().toISOString();

    if (existing) {
        repository
            .restoreExternalParticipant({
                participantId:
                    existing.id,
                participantType,
                joinedAt:
                    now
            });

        return repository
            .getParticipantById(
                existing.id
            );
    }

    const participantId =
        repository
            .insertExternalParticipant({
                conversationId,
                externalName,
                externalPhone,
                participantType,
                isAdmin:
                    options.isAdmin
                        ? 1
                        : 0,
                joinedAt:
                    now
            });

    repository.touch(
        conversationId
    );

    return repository
        .getParticipantById(
            participantId
        );
}

function removeParticipant(
    conversationId,
    participantId
) {
    const participant =
        repository
            .getParticipantById(
                participantId
            );

    if (
        !participant
        || Number(
            participant.conversation_id
        ) !== Number(conversationId)
    ) {
        throw new Error(
            "Participant introuvable."
        );
    }

    repository.markParticipantLeft(
        participantId,
        new Date().toISOString()
    );

    repository.touch(
        conversationId
    );

    return repository
        .getParticipantById(
            participantId
        );
}

function ensureLegacyParticipants(
    conversationId
) {
    const conversation =
        repository.getById(
            conversationId
        );

    if (!conversation) {
        return;
    }

    if (conversation.phone_a_id) {
        addGreycoreParticipant(
            conversationId,
            conversation.phone_a_id,
            {
                isAdmin:
                    true,
                joinedAt:
                    conversation.created_at
            }
        );
    }

    if (conversation.phone_b_id) {
        addGreycoreParticipant(
            conversationId,
            conversation.phone_b_id,
            {
                joinedAt:
                    conversation.created_at
            }
        );
    }
}

module.exports = {
    addGreycoreParticipant,
    addExternalParticipant,
    removeParticipant,
    ensureLegacyParticipants
};
