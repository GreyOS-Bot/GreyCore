const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "une conversation privée ajoute automatiquement les deux personnages aux contacts",
    () => {
        const calls = [];

        const conversation = {
            id:
                "conversation"
        };

        stubModule(
            "src/v2/managers/PhoneConversationV2Manager.js",
            {
                createPrivate: (
                    phoneAId,
                    phoneBId
                ) => {
                    calls.push([
                        "conversation",
                        phoneAId,
                        phoneBId
                    ]);

                    return conversation;
                },
                getById:
                    () => null,
                getPrivateBetweenPhones:
                    () => null,
                getForPhone:
                    () => [],
                getMessages:
                    () => []
            }
        );

        stubModule(
            "src/v2/managers/PhoneContactV2Manager.js",
            {
                ensureMutualGreycoreContacts: (
                    phoneAId,
                    phoneBId
                ) => calls.push([
                    "contacts",
                    phoneAId,
                    phoneBId
                ])
            }
        );

        const gatewayPath =
            require.resolve(
                "../src/v2/managers/phone/PhoneConversationGateway"
            );

        delete require.cache[
            gatewayPath
        ];

        const gateway =
            require(
                "../src/v2/managers/phone/PhoneConversationGateway"
            );

        assert.equal(
            gateway.getOrCreateConversation(
                10,
                20
            ),
            conversation
        );

        assert.deepEqual(
            calls,
            [
                [
                    "conversation",
                    10,
                    20
                ],
                [
                    "contacts",
                    10,
                    20
                ]
            ]
        );
    }
);
