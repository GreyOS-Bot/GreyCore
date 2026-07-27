const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les conversations téléphone gardent création, participants et affichage après leur découpe",
    () => {
        const calls = [];
        const conversations =
            new Map();
        const participants =
            new Map();
        const phones =
            new Set([
                1,
                2,
                3
            ]);

        let nextConversationId =
            100;
        let nextParticipantId =
            500;

        const repository = {
            runInTransaction:
                operation =>
                    operation(),
            getById:
                conversationId =>
                    conversations.get(
                        Number(
                            conversationId
                        )
                    )
                    || null,
            getParticipantById:
                participantId =>
                    participants.get(
                        Number(
                            participantId
                        )
                    )
                    || null,
            getParticipants:
                conversationId =>
                    Array.from(
                        participants.values()
                    )
                        .filter(
                            participant =>
                                Number(
                                    participant
                                        .conversation_id
                                ) ===
                                    Number(
                                        conversationId
                                    )
                                && !participant
                                    .has_left
                        )
                        .map(
                            participant => ({
                                ...participant,
                                character_name:
                                    participant
                                        .phone_id
                                        ? {
                                            1:
                                                "Alba",
                                            2:
                                                "Billie",
                                            3:
                                                "Zoé"
                                        }[
                                            participant
                                                .phone_id
                                        ]
                                        : null
                            })
                        ),
            getParticipant:
                (
                    conversationId,
                    phoneId
                ) =>
                    Array.from(
                        participants.values()
                    ).find(
                        participant =>
                            Number(
                                participant
                                    .conversation_id
                            ) ===
                                Number(
                                    conversationId
                                )
                            && Number(
                                participant
                                    .phone_id
                            ) ===
                                Number(phoneId)
                            && !participant
                                .has_left
                    )
                    || null,
            getPrivateBetweenPhones:
                (
                    phoneAId,
                    phoneBId
                ) =>
                    Array.from(
                        conversations.values()
                    ).find(
                        conversation =>
                            conversation
                                .conversation_type ===
                                "private"
                            && Number(
                                conversation
                                    .phone_a_id
                            ) ===
                                Number(phoneAId)
                            && Number(
                                conversation
                                    .phone_b_id
                            ) ===
                                Number(phoneBId)
                    )
                    || null,
            getPhoneById:
                phoneId =>
                    phones.has(
                        Number(phoneId)
                    )
                        ? {
                            id:
                                Number(phoneId)
                        }
                        : null,
            insertPrivate:
                data => {
                    const id =
                        nextConversationId++;

                    conversations.set(
                        id,
                        {
                            id,
                            conversation_type:
                                "private",
                            owner_phone_id:
                                Number(
                                    data.ownerPhoneId
                                ),
                            phone_a_id:
                                Number(
                                    data.phoneAId
                                ),
                            phone_b_id:
                                Number(
                                    data.phoneBId
                                ),
                            created_at:
                                data.createdAt,
                            updated_at:
                                data.createdAt
                        }
                    );

                    return id;
                },
            insertGroup:
                data => {
                    const id =
                        nextConversationId++;

                    conversations.set(
                        id,
                        {
                            id,
                            conversation_type:
                                "group",
                            name:
                                data.name,
                            owner_phone_id:
                                Number(
                                    data.ownerPhoneId
                                ),
                            created_at:
                                data.createdAt,
                            updated_at:
                                data.createdAt
                        }
                    );

                    return id;
                },
            findGreycoreParticipant:
                (
                    conversationId,
                    phoneId
                ) =>
                    Array.from(
                        participants.values()
                    ).find(
                        participant =>
                            Number(
                                participant
                                    .conversation_id
                            ) ===
                                Number(
                                    conversationId
                                )
                            && Number(
                                participant
                                    .phone_id
                            ) ===
                                Number(phoneId)
                    )
                    || null,
            restoreGreycoreParticipant:
                data => {
                    const participant =
                        participants.get(
                            Number(
                                data.participantId
                            )
                        );

                    Object.assign(
                        participant,
                        {
                            has_left:
                                0,
                            is_admin:
                                data.isAdmin,
                            joined_at:
                                data.joinedAt
                        }
                    );
                },
            insertGreycoreParticipant:
                data => {
                    const id =
                        nextParticipantId++;

                    participants.set(
                        id,
                        {
                            id,
                            conversation_id:
                                Number(
                                    data.conversationId
                                ),
                            phone_id:
                                Number(
                                    data.phoneId
                                ),
                            participant_type:
                                "greycore",
                            is_admin:
                                data.isAdmin,
                            has_left:
                                0,
                            joined_at:
                                data.joinedAt
                        }
                    );

                    return id;
                },
            findExternalParticipant:
                data =>
                    Array.from(
                        participants.values()
                    ).find(
                        participant =>
                            Number(
                                participant
                                    .conversation_id
                            ) ===
                                Number(
                                    data.conversationId
                                )
                            && !participant
                                .phone_id
                            && participant
                                .external_name ===
                                data.externalName
                            && participant
                                .external_phone ===
                                data.externalPhone
                    )
                    || null,
            restoreExternalParticipant:
                data => {
                    const participant =
                        participants.get(
                            Number(
                                data.participantId
                            )
                        );

                    Object.assign(
                        participant,
                        {
                            has_left:
                                0,
                            participant_type:
                                data
                                    .participantType,
                            joined_at:
                                data.joinedAt
                        }
                    );
                },
            insertExternalParticipant:
                data => {
                    const id =
                        nextParticipantId++;

                    participants.set(
                        id,
                        {
                            id,
                            conversation_id:
                                Number(
                                    data.conversationId
                                ),
                            phone_id:
                                null,
                            external_name:
                                data.externalName,
                            external_phone:
                                data.externalPhone,
                            participant_type:
                                data.participantType,
                            is_admin:
                                data.isAdmin,
                            has_left:
                                0,
                            joined_at:
                                data.joinedAt
                        }
                    );

                    return id;
                },
            markParticipantLeft:
                participantId => {
                    participants.get(
                        Number(
                            participantId
                        )
                    ).has_left = 1;
                },
            renameGroup:
                (
                    conversationId,
                    name,
                    updatedAt
                ) => {
                    Object.assign(
                        conversations.get(
                            Number(
                                conversationId
                            )
                        ),
                        {
                            name,
                            updated_at:
                                updatedAt
                        }
                    );
                },
            getForPhone:
                phoneId =>
                    Array.from(
                        conversations.values()
                    )
                        .filter(
                            conversation =>
                                repository
                                    .getParticipant(
                                        conversation.id,
                                        phoneId
                                    )
                        )
                        .map(
                            conversation => ({
                                ...conversation
                            })
                        ),
            touch:
                conversationId =>
                    calls.push([
                        "touch",
                        Number(
                            conversationId
                        )
                    ])
        };

        stubModule(
            "src/v2/managers/phoneConversation/PhoneConversationRepository.js",
            repository
        );

        stubModule(
            "src/v2/managers/PhoneMessageV2Manager.js",
            {
                getForConversation:
                    (
                        conversationId,
                        limit
                    ) => [
                        {
                            id:
                                900,
                            conversation_id:
                                conversationId,
                            limit
                        }
                    ]
            }
        );

        const manager =
            require(
                "../src/v2/managers/PhoneConversationV2Manager"
            );

        const publicMethods = [
            "getById",
            "getParticipantById",
            "getParticipants",
            "getParticipant",
            "isParticipant",
            "getPrivateBetweenPhones",
            "createPrivate",
            "createGroup",
            "addGreycoreParticipant",
            "addExternalParticipant",
            "removeParticipant",
            "rename",
            "getForPhone",
            "getDisplayName",
            "getOtherParticipant",
            "ensureLegacyParticipants",
            "touch",
            "getMessages"
        ];

        for (
            const method
            of publicMethods
        ) {
            assert.equal(
                typeof manager[method],
                "function",
                method
            );
        }

        const privateConversation =
            manager.createPrivate(
                2,
                1
            );

        assert.equal(
            privateConversation
                .owner_phone_id,
            2
        );

        assert.equal(
            privateConversation
                .phone_a_id,
            1
        );

        assert.equal(
            privateConversation
                .phone_b_id,
            2
        );

        assert.equal(
            manager.getParticipants(
                privateConversation.id
            ).length,
            2
        );

        assert.equal(
            manager.isParticipant(
                privateConversation.id,
                1
            ),
            true
        );

        assert.equal(
            manager.getDisplayName(
                privateConversation,
                1
            ),
            "Billie"
        );

        assert.equal(
            manager
                .getOtherParticipant(
                    privateConversation.id,
                    1
                )
                .phone_id,
            2
        );

        const existingConversation =
            manager.createPrivate(
                1,
                2
            );

        assert.equal(
            existingConversation.id,
            privateConversation.id
        );

        assert.equal(
            manager.getParticipants(
                privateConversation.id
            ).length,
            2
        );

        const group =
            manager.createGroup({
                ownerPhoneId:
                    1,
                name:
                    "  La bande  ",
                phoneIds: [
                    2,
                    3,
                    3
                ],
                externalParticipants: [
                    {
                        name:
                            "Le Taxi",
                        phoneNumber:
                            "555-TAXI",
                        type:
                            "external"
                    }
                ]
            });

        assert.equal(
            group.name,
            "La bande"
        );

        assert.equal(
            manager.getParticipants(
                group.id
            ).length,
            4
        );

        assert.equal(
            manager.getDisplayName(
                group,
                1
            ),
            "La bande"
        );

        const renamed =
            manager.rename(
                group.id,
                "  Les proches  "
            );

        assert.equal(
            renamed.name,
            "Les proches"
        );

        const groupParticipant =
            manager.getParticipants(
                group.id
            ).find(
                participant =>
                    Number(
                        participant.phone_id
                    ) === 3
            );

        manager.removeParticipant(
            group.id,
            groupParticipant.id
        );

        assert.equal(
            manager.isParticipant(
                group.id,
                3
            ),
            false
        );

        const phoneConversations =
            manager.getForPhone(
                1
            );

        assert.equal(
            phoneConversations.some(
                conversation =>
                    conversation
                        .other_character_name ===
                        "Billie"
            ),
            true
        );

        assert.deepEqual(
            manager.getMessages(
                privateConversation.id,
                10
            ),
            [
                {
                    id:
                        900,
                    conversation_id:
                        privateConversation.id,
                    limit:
                        10
                }
            ]
        );

        assert.throws(
            () =>
                manager.createPrivate(
                    1,
                    1
                ),
            /lui-même/
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                    "touch"
            ),
            true
        );
    }
);
