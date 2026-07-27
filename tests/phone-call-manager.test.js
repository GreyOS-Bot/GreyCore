const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les appels téléphone gardent leur cycle complet après leur découpe",
    () => {
        const phones =
            new Map([
                [
                    1,
                    {
                        id:
                            1,
                        is_active:
                            1
                    }
                ],
                [
                    2,
                    {
                        id:
                            2,
                        is_active:
                            1
                    }
                ],
                [
                    3,
                    {
                        id:
                            3,
                        is_active:
                            0
                    }
                ]
            ]);

        const calls =
            new Map();
        const messages =
            new Map();

        let nextCallId =
            100;
        let nextMessageId =
            500;

        const repository = {
            getById:
                callId =>
                    calls.get(
                        Number(callId)
                    )
                    || null,
            getPhoneById:
                phoneId =>
                    phones.get(
                        Number(phoneId)
                    )
                    || null,
            getActiveForPhone:
                phoneId =>
                    Array.from(
                        calls.values()
                    )
                        .filter(
                            call =>
                                (
                                    Number(
                                        call
                                            .caller_phone_id
                                    ) ===
                                        Number(phoneId)
                                    || Number(
                                        call
                                            .receiver_phone_id
                                    ) ===
                                        Number(phoneId)
                                )
                                && [
                                    "ringing",
                                    "accepted"
                                ].includes(
                                    call.status
                                )
                        )
                        .sort(
                            (
                                callA,
                                callB
                            ) =>
                                Number(callB.id)
                                -
                                Number(callA.id)
                        )[0]
                    || null,
            getHistoryForPhone:
                (
                    phoneId,
                    limit
                ) =>
                    Array.from(
                        calls.values()
                    )
                        .filter(
                            call =>
                                Number(
                                    call
                                        .caller_phone_id
                                ) ===
                                    Number(phoneId)
                                || Number(
                                    call
                                        .receiver_phone_id
                                ) ===
                                    Number(phoneId)
                        )
                        .slice(
                            0,
                            limit
                        ),
            insertCall:
                data => {
                    const id =
                        nextCallId++;

                    calls.set(
                        id,
                        {
                            id,
                            caller_phone_id:
                                data.callerPhoneId,
                            receiver_phone_id:
                                data.receiverPhoneId,
                            status:
                                "ringing",
                            created_at:
                                data.createdAt
                        }
                    );

                    return id;
                },
            transitionCall:
                data => {
                    const call =
                        calls.get(
                            Number(
                                data.callId
                            )
                        );

                    if (
                        !call
                        || call.status !==
                            data.expectedStatus
                    ) {
                        return 0;
                    }

                    call.status =
                        data.nextStatus;

                    if (
                        data.timestampField ===
                        "answered_at"
                    ) {
                        call.answered_at =
                            data.occurredAt;
                    } else {
                        call.ended_at =
                            data.occurredAt;
                    }

                    if (
                        data.updateTimestamp
                    ) {
                        call.updated_at =
                            data.occurredAt;
                    }

                    return 1;
                },
            expireStaleRingingCalls:
                data => {
                    let changes = 0;

                    for (
                        const call
                        of calls.values()
                    ) {
                        if (
                            call.status ===
                                "ringing"
                            && call.created_at <=
                                data.limitDate
                        ) {
                            call.status =
                                "missed";
                            call.ended_at =
                                data.endedAt;
                            changes += 1;
                        }
                    }

                    return changes;
                },
            insertMessage:
                data => {
                    const id =
                        nextMessageId++;

                    messages.set(
                        id,
                        {
                            id,
                            call_id:
                                data.callId,
                            speaker_phone_id:
                                data.speakerPhoneId,
                            content:
                                data.content,
                            created_at:
                                data.createdAt
                        }
                    );

                    return id;
                },
            getMessageById:
                messageId =>
                    messages.get(
                        Number(
                            messageId
                        )
                    )
                    || null,
            getMessages:
                callId =>
                    Array.from(
                        messages.values()
                    ).filter(
                        message =>
                            Number(
                                message.call_id
                            ) ===
                            Number(callId)
                    )
        };

        stubModule(
            "src/v2/managers/phoneCall/PhoneCallRepository.js",
            repository
        );

        const manager =
            require(
                "../src/v2/managers/PhoneCallV2Manager"
            );

        const publicMethods = [
            "expireStaleRingingCalls",
            "getById",
            "getActiveForPhone",
            "getHistoryForPhone",
            "createCall",
            "acceptCall",
            "refuseCall",
            "cancelCall",
            "markMissed",
            "createMessage",
            "getMessages",
            "endCall"
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

        const acceptedCall =
            manager.createCall({
                callerPhoneId:
                    1,
                receiverPhoneId:
                    2
            });

        assert.equal(
            acceptedCall.status,
            "ringing"
        );

        assert.equal(
            manager
                .getActiveForPhone(1)
                .id,
            acceptedCall.id
        );

        assert.throws(
            () =>
                manager.createCall({
                    callerPhoneId:
                        1,
                    receiverPhoneId:
                        2
                }),
            /déjà en communication/
        );

        manager.acceptCall(
            acceptedCall.id
        );

        assert.equal(
            manager.getById(
                acceptedCall.id
            ).status,
            "accepted"
        );

        const message =
            manager.createMessage({
                callId:
                    acceptedCall.id,
                speakerPhoneId:
                    1,
                content:
                    "  Bonjour !  "
            });

        assert.equal(
            message.content,
            "Bonjour !"
        );

        assert.equal(
            manager.getMessages(
                acceptedCall.id
            ).length,
            1
        );

        manager.endCall(
            acceptedCall.id
        );

        assert.equal(
            manager.getById(
                acceptedCall.id
            ).status,
            "ended"
        );

        const refusedCall =
            manager.createCall({
                callerPhoneId:
                    1,
                receiverPhoneId:
                    2
            });

        manager.refuseCall(
            refusedCall.id
        );

        assert.equal(
            manager.getById(
                refusedCall.id
            ).status,
            "refused"
        );

        const cancelledCall =
            manager.createCall({
                callerPhoneId:
                    1,
                receiverPhoneId:
                    2
            });

        manager.cancelCall(
            cancelledCall.id
        );

        assert.equal(
            manager.getById(
                cancelledCall.id
            ).status,
            "cancelled"
        );

        const missedCall =
            manager.createCall({
                callerPhoneId:
                    1,
                receiverPhoneId:
                    2
            });

        manager.markMissed(
            missedCall.id
        );

        assert.equal(
            manager.getById(
                missedCall.id
            ).status,
            "missed"
        );

        assert.ok(
            manager.getById(
                missedCall.id
            ).updated_at
        );

        calls.set(
            900,
            {
                id:
                    900,
                caller_phone_id:
                    1,
                receiver_phone_id:
                    2,
                status:
                    "ringing",
                created_at:
                    "2000-01-01T00:00:00.000Z"
            }
        );

        calls.set(
            901,
            {
                id:
                    901,
                caller_phone_id:
                    1,
                receiver_phone_id:
                    2,
                status:
                    "ringing",
                created_at:
                    "2999-01-01T00:00:00.000Z"
            }
        );

        assert.equal(
            manager
                .expireStaleRingingCalls(
                    30
                ),
            1
        );

        assert.equal(
            manager.getById(900).status,
            "missed"
        );

        assert.equal(
            manager.getById(901).status,
            "ringing"
        );

        assert.equal(
            manager
                .getHistoryForPhone(
                    1,
                    3
                )
                .length,
            3
        );

        assert.throws(
            () =>
                manager.createCall({
                    callerPhoneId:
                        1,
                    receiverPhoneId:
                        1
                }),
            /lui-même/
        );

        assert.throws(
            () =>
                manager.createCall({
                    callerPhoneId:
                        1,
                    receiverPhoneId:
                        3
                }),
            /destinataire est désactivé/
        );

        assert.throws(
            () =>
                manager.createMessage({
                    callId:
                        acceptedCall.id,
                    speakerPhoneId:
                        1,
                    content:
                        "   "
                }),
            /message ne peut pas être vide/
        );

        assert.throws(
            () =>
                manager.acceptCall(
                    acceptedCall.id
                ),
            /ne peut plus être accepté/
        );
    }
);
