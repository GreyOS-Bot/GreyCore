const repository =
    require(
        "./PhoneConversationRepository"
    );

const participantManager =
    require(
        "./PhoneConversationParticipantManager"
    );

const unitOfWork =
    require(
        "./PhoneConversationUnitOfWork"
    );

function createPrivate(
    phoneAId,
    phoneBId
) {
    if (
        Number(phoneAId) ===
        Number(phoneBId)
    ) {
        throw new Error(
            "Un téléphone ne peut pas créer une conversation avec lui-même."
        );
    }

    const phoneA =
        repository.getPhoneById(
            phoneAId
        );

    const phoneB =
        repository.getPhoneById(
            phoneBId
        );

    if (
        !phoneA
        || !phoneB
    ) {
        throw new Error(
            "L’un des téléphones est introuvable."
        );
    }

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

    const existing =
        repository
            .getPrivateBetweenPhones(
                orderedPhoneA,
                orderedPhoneB
            );

    if (existing) {
        participantManager
            .ensureLegacyParticipants(
                existing.id
            );

        return existing;
    }

    const now =
        new Date().toISOString();

    const conversationId =
        unitOfWork.run(
            () => {
                const conversationId =
                    repository
                        .insertPrivate({
                            ownerPhoneId:
                                phoneAId,
                            phoneAId:
                                orderedPhoneA,
                            phoneBId:
                                orderedPhoneB,
                            createdAt:
                                now
                        });

                participantManager
                    .addGreycoreParticipant(
                        conversationId,
                        phoneAId,
                        {
                            isAdmin:
                                true,
                            joinedAt:
                                now
                        }
                    );

                participantManager
                    .addGreycoreParticipant(
                        conversationId,
                        phoneBId,
                        {
                            isAdmin:
                                false,
                            joinedAt:
                                now
                        }
                    );

                return conversationId;
            }
        );

    return repository.getById(
        conversationId
    );
}

function createGroup(
    data
) {
    const ownerPhoneId =
        Number(data.ownerPhoneId);

    const ownerPhone =
        repository.getPhoneById(
            ownerPhoneId
        );

    if (!ownerPhone) {
        throw new Error(
            "Téléphone propriétaire introuvable."
        );
    }

    const groupName =
        data.name?.trim()
        || null;

    const now =
        new Date().toISOString();

    const conversationId =
        unitOfWork.run(
            () => {
                const conversationId =
                    repository
                        .insertGroup({
                            name:
                                groupName,
                            ownerPhoneId,
                            createdAt:
                                now
                        });

                participantManager
                    .addGreycoreParticipant(
                        conversationId,
                        ownerPhoneId,
                        {
                            isAdmin:
                                true,
                            joinedAt:
                                now
                        }
                    );

                const greycorePhoneIds =
                    Array.from(
                        new Set(
                            (
                                data.phoneIds
                                || []
                            )
                                .map(Number)
                                .filter(
                                    phoneId =>
                                        phoneId
                                        && phoneId !==
                                            ownerPhoneId
                                )
                        )
                    );

                for (
                    const phoneId
                    of greycorePhoneIds
                ) {
                    participantManager
                        .addGreycoreParticipant(
                            conversationId,
                            phoneId,
                            {
                                joinedAt:
                                    now
                            }
                        );
                }

                for (
                    const external
                    of data
                        .externalParticipants
                        || []
                ) {
                    participantManager
                        .addExternalParticipant(
                            conversationId,
                            external,
                            {
                                joinedAt:
                                    now
                            }
                        );
                }

                const participantCount =
                    repository
                        .getParticipants(
                            conversationId
                        )
                        .length;

                if (
                    participantCount < 3
                ) {
                    throw new Error(
                        "Un groupe doit contenir au moins trois participants."
                    );
                }

                return conversationId;
            }
        );

    return repository.getById(
        conversationId
    );
}

function rename(
    conversationId,
    name
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

    if (
        conversation.conversation_type !==
        "group"
    ) {
        throw new Error(
            "Seuls les groupes peuvent être renommés."
        );
    }

    repository.renameGroup(
        conversationId,
        name?.trim() || null,
        new Date().toISOString()
    );

    return repository.getById(
        conversationId
    );
}

module.exports = {
    createPrivate,
    createGroup,
    rename
};
