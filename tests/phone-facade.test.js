const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la façade téléphone conserve numéros, messages, conversations et appels",
    () => {
        const calls = [];
        const phones =
            new Map();
        let nextPhoneId =
            1;

        const repository = {
            getPhoneById:
                phoneId =>
                    phones.get(
                        Number(phoneId)
                    )
                    || null,
            getPhoneByContinuity:
                continuityId =>
                    Array.from(
                        phones.values()
                    ).find(
                        phone =>
                            Number(
                                phone.continuity_id
                            ) ===
                            Number(continuityId)
                    )
                    || null,
            getContinuityByPhone:
                phoneId => {
                    const phone =
                        phones.get(
                            Number(phoneId)
                        );

                    return phone
                        ? {
                            id:
                                phone
                                    .continuity_id
                        }
                        : null;
                },
            getPhoneByNumber:
                phoneNumber =>
                    Array.from(
                        phones.values()
                    ).find(
                        phone =>
                            phone.phone_number ===
                            phoneNumber
                    )
                    || null,
            insertPhone:
                data => {
                    const id =
                        nextPhoneId++;

                    phones.set(
                        id,
                        {
                            id,
                            continuity_id:
                                data.continuityId,
                            phone_number:
                                data.phoneNumber,
                            is_active:
                                data.isActive,
                            created_at:
                                data.createdAt,
                            updated_at:
                                data.updatedAt
                        }
                    );

                    return id;
                },
            setActive:
                (
                    phoneId,
                    isActive,
                    updatedAt
                ) => {
                    Object.assign(
                        phones.get(
                            Number(phoneId)
                        ),
                        {
                            is_active:
                                isActive,
                            updated_at:
                                updatedAt
                        }
                    );
                },
            touchConversation:
                (
                    conversationId,
                    updatedAt
                ) =>
                    calls.push([
                        "conversation.touch",
                        conversationId,
                        updatedAt
                    ])
        };

        const conversation = {
            id:
                50,
            phone_a_id:
                1,
            phone_b_id:
                2
        };

        const conversationManager = {
            getById:
                conversationId =>
                    Number(
                        conversationId
                    ) === 50
                        ? conversation
                        : null,
            getPrivateBetweenPhones:
                (
                    phoneAId,
                    phoneBId
                ) => ({
                    phoneAId,
                    phoneBId
                }),
            createPrivate:
                (
                    phoneAId,
                    phoneBId
                ) => ({
                    created:
                        true,
                    phoneAId,
                    phoneBId
                }),
            getForPhone:
                phoneId => [
                    {
                        id:
                            50,
                        phoneId
                    }
                ],
            getMessages:
                (
                    conversationId,
                    limit
                ) => [
                    {
                        source:
                            "conversation",
                        conversationId,
                        limit
                    }
                ]
        };

        let nextMessageId =
            800;
        const messages =
            new Map();

        const messageManager = {
            getById:
                messageId =>
                    messages.get(
                        Number(messageId)
                    )
                    || null,
            getForConversation:
                (
                    conversationId,
                    limit
                ) => [
                    {
                        source:
                            "message",
                        conversationId,
                        limit
                    }
                ],
            delete:
                messageId => {
                    const message =
                        messages.get(
                            Number(messageId)
                        );

                    messages.delete(
                        Number(messageId)
                    );

                    return message;
                },
            insert:
                data => {
                    const id =
                        nextMessageId++;
                    const message = {
                        id,
                        ...data
                    };

                    messages.set(
                        id,
                        message
                    );

                    return message;
                },
            updatePublication:
                (
                    messageId,
                    data
                ) => ({
                    id:
                        messageId,
                    ...data
                })
        };

        const callManager = {
            getById:
                callId => ({
                    id:
                        callId
                }),
            expireStaleRingingCalls:
                maximumAgeSeconds => {
                    calls.push([
                        "calls.expire",
                        maximumAgeSeconds
                    ]);

                    return 2;
                },
            getActiveForPhone:
                phoneId => ({
                    id:
                        70,
                    phoneId
                }),
            getHistoryForPhone:
                (
                    phoneId,
                    limit
                ) => [
                    {
                        phoneId,
                        limit
                    }
                ],
            createCall:
                data => ({
                    action:
                        "create",
                    ...data
                }),
            acceptCall:
                callId => ({
                    action:
                        "accept",
                    callId
                }),
            refuseCall:
                callId => ({
                    action:
                        "refuse",
                    callId
                }),
            cancelCall:
                callId => ({
                    action:
                        "cancel",
                    callId
                }),
            markMissed:
                callId => ({
                    action:
                        "missed",
                    callId
                }),
            endCall:
                callId => ({
                    action:
                        "end",
                    callId
                })
        };

        stubModule(
            "src/v2/managers/phone/PhoneRepository.js",
            repository
        );

        stubModule(
            "src/v2/managers/PhoneConversationV2Manager.js",
            conversationManager
        );

        stubModule(
            "src/v2/managers/PhoneMessageV2Manager.js",
            messageManager
        );

        stubModule(
            "src/v2/managers/PhoneCallV2Manager.js",
            callManager
        );

        const manager =
            require(
                "../src/v2/managers/PhoneV2Manager"
            );

        const publicMethods = [
            "getPhoneById",
            "getPhoneByContinuity",
            "getContinuityByPhone",
            "getPhoneByNumber",
            "generatePhoneNumber",
            "createPhone",
            "setActive",
            "getConversationById",
            "getConversationBetweenPhones",
            "getOrCreateConversation",
            "getConversationsForPhone",
            "getMessages",
            "getMessageById",
            "getForConversation",
            "deleteMessage",
            "createMessage",
            "updateMessagePublication",
            "getCallById",
            "getActiveCall",
            "getCallHistory",
            "createCall",
            "acceptCall",
            "refuseCall",
            "cancelCall",
            "markMissed",
            "endCall",
            "expireStaleRingingCalls"
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

        const phoneA =
            manager.createPhone({
                continuityId:
                    101,
                phoneNumber:
                    "555-0001"
            });

        const phoneB =
            manager.createPhone({
                continuityId:
                    102,
                phoneNumber:
                    "555-0002"
            });

        manager.createPhone({
            continuityId:
                103,
            phoneNumber:
                "555-0003"
        });

        assert.equal(
            phoneA.is_active,
            1
        );

        assert.equal(
            manager.getPhoneByContinuity(
                101
            ).id,
            phoneA.id
        );

        assert.equal(
            manager
                .getContinuityByPhone(
                    phoneA.id
                )
                .id,
            101
        );

        manager.setActive(
            phoneB.id,
            false
        );

        assert.equal(
            manager.getPhoneById(
                phoneB.id
            ).is_active,
            0
        );

        assert.equal(
            manager
                .createPhone({
                    continuityId:
                        101,
                    phoneNumber:
                        "555-AUTRE"
                })
                .id,
            phoneA.id
        );

        assert.throws(
            () =>
                manager.createPhone({
                    continuityId:
                        999,
                    phoneNumber:
                        "555-0001"
                }),
            /déjà utilisé/
        );

        const originalRandom =
            Math.random;

        try {
            Math.random =
                () => 0;

            assert.equal(
                manager
                    .generatePhoneNumber(),
                "555-1000"
            );
        } finally {
            Math.random =
                originalRandom;
        }

        assert.equal(
            manager
                .getConversationById(50)
                .id,
            50
        );

        assert.equal(
            manager
                .getOrCreateConversation(
                    1,
                    2
                )
                .created,
            true
        );

        assert.equal(
            manager
                .getConversationsForPhone(
                    1
                ).length,
            1
        );

        const message =
            manager.createMessage({
                conversationId:
                    50,
                senderPhoneId:
                    1,
                content:
                    "  Bonjour  ",
                createdAt:
                    "2026-07-26T12:00:00.000Z"
            });

        assert.equal(
            message.content,
            "Bonjour"
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                    "conversation.touch"
            ),
            true
        );

        assert.equal(
            manager.getMessageById(
                message.id
            ).id,
            message.id
        );

        assert.equal(
            manager.getMessages(
                50,
                10
            )[0].source,
            "conversation"
        );

        assert.equal(
            manager.getForConversation(
                50,
                10
            )[0].source,
            "message"
        );

        assert.equal(
            manager
                .updateMessagePublication(
                    message.id,
                    {
                        publicGuildId:
                            "guild"
                    }
                )
                .publicGuildId,
            "guild"
        );

        assert.equal(
            manager.deleteMessage(
                message.id
            ).id,
            message.id
        );

        assert.throws(
            () =>
                manager.createMessage({
                    conversationId:
                        50,
                    senderPhoneId:
                        3,
                    content:
                        "Intrusion"
                }),
            /n’appartient pas/
        );

        assert.throws(
            () =>
                manager.createMessage({
                    conversationId:
                        50,
                    senderPhoneId:
                        1,
                    content:
                        "   "
                }),
            /message ne peut pas être vide/
        );

        assert.equal(
            manager.getActiveCall(1).id,
            70
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "calls.expire"
            ),
            false
        );

        assert.equal(
            manager
                .getCallHistory(
                    1,
                    5
                )[0].limit,
            5
        );

        assert.equal(
            manager
                .createCall({
                    callerPhoneId:
                        1,
                    receiverPhoneId:
                        2
                })
                .action,
            "create"
        );

        assert.equal(
            manager.acceptCall(70)
                .action,
            "accept"
        );

        assert.equal(
            manager.refuseCall(70)
                .action,
            "refuse"
        );

        assert.equal(
            manager.cancelCall(70)
                .action,
            "cancel"
        );

        assert.equal(
            manager.markMissed(70)
                .action,
            "missed"
        );

        assert.equal(
            manager.endCall(70)
                .action,
            "end"
        );

        assert.equal(
            manager
                .expireStaleRingingCalls(
                    60
                ),
            2
        );
    }
);
