const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les deux interfaces d’appel restent synchronisées après leur découpe",
    async () => {
        const calls = [];
        const sessions =
            new Map();

        const phones =
            new Map([
                [
                    1,
                    {
                        id:
                            1
                    }
                ],
                [
                    2,
                    {
                        id:
                            2
                    }
                ]
            ]);

        const continuities =
            new Map([
                [
                    1,
                    {
                        id:
                            101,
                        character_id:
                            201
                    }
                ],
                [
                    2,
                    {
                        id:
                            102,
                        character_id:
                            202
                    }
                ]
            ]);

        const characters =
            new Map([
                [
                    201,
                    {
                        id:
                            201,
                        proxy_name:
                            "Alba"
                    }
                ],
                [
                    202,
                    {
                        id:
                            202,
                        proxy_name:
                            "Billie"
                    }
                ]
            ]);

        let currentCall = {
            id:
                70,
            caller_phone_id:
                1,
            receiver_phone_id:
                2,
            status:
                "accepted"
        };

        stubModule(
            "src/v2/managers/PhoneCallSessionManager.js",
            {
                get:
                    callId =>
                        sessions.get(
                            Number(callId)
                        )
                        || null,
                remove:
                    callId => {
                        calls.push([
                            "session.remove",
                            Number(callId)
                        ]);

                        sessions.delete(
                            Number(callId)
                        );
                    }
            }
        );

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getCallById:
                    callId =>
                        Number(callId) ===
                            currentCall.id
                            ? currentCall
                            : null,
                getPhoneById:
                    phoneId =>
                        phones.get(
                            Number(phoneId)
                        )
                        || null,
                getContinuityByPhone:
                    phoneId =>
                        continuities.get(
                            Number(phoneId)
                        )
                        || null
            }
        );

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    characterId =>
                        characters.get(
                            Number(
                                characterId
                            )
                        )
                        || null
            }
        );

        stubModule(
            "src/v2/pages/character/CharacterPhoneCallPage.js",
            {
                build:
                    ({
                        character,
                        phone,
                        call,
                        contactName
                    }) => ({
                        marker:
                            "call-page",
                        characterName:
                            character
                                .proxy_name,
                        phoneId:
                            phone.id,
                        callStatus:
                            call.status,
                        contactName
                    })
            }
        );

        const callerInteraction = {
            editReply:
                async payload =>
                    calls.push([
                        "caller.edit",
                        payload
                    ])
        };

        const receiverMessage = {
            edit:
                async payload =>
                    calls.push([
                        "receiver.edit",
                        payload
                    ])
        };

        sessions.set(
            70,
            {
                callerInteraction,
                receiverMessage
            }
        );

        const manager =
            require(
                "../src/v2/managers/PhoneCallUIManager"
            );

        assert.equal(
            typeof manager.refresh,
            "function"
        );

        assert.equal(
            typeof manager.refreshSide,
            "function"
        );

        assert.equal(
            typeof manager.getContactName,
            "function"
        );

        await manager.refresh(70);

        const callerEdit =
            calls.find(
                call =>
                    call[0] ===
                    "caller.edit"
            );

        const receiverEdit =
            calls.find(
                call =>
                    call[0] ===
                    "receiver.edit"
            );

        assert.equal(
            callerEdit[1]
                .characterName,
            "Alba"
        );

        assert.equal(
            callerEdit[1]
                .contactName,
            "Billie"
        );

        assert.equal(
            receiverEdit[1]
                .characterName,
            "Billie"
        );

        assert.equal(
            receiverEdit[1]
                .contactName,
            "Alba"
        );

        assert.equal(
            sessions.has(70),
            true
        );

        assert.equal(
            manager.getContactName(2),
            "Billie"
        );

        assert.equal(
            manager.getContactName(999),
            "Correspondant"
        );

        currentCall = {
            ...currentCall,
            status:
                "ended"
        };

        await manager.refresh(70);

        assert.equal(
            sessions.has(70),
            false
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "session.remove"
                    && call[1] ===
                        70
            ),
            true
        );

        const directTarget = {
            editReply:
                async payload =>
                    calls.push([
                        "direct.edit",
                        payload
                    ])
        };

        await manager.refreshSide({
            target:
                directTarget,
            targetType:
                "interaction",
            call:
                currentCall,
            phoneId:
                1,
            otherPhoneId:
                2,
            side:
                "caller"
        });

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                    "direct.edit"
            ),
            true
        );
    }
);
