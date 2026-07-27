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
    "la notification SMS contient un lien direct vers le message du salon",
    async () => {
        const payloads = [];

        const service =
            createService();

        await service.notifyNewSms({
            client:
                createClient(
                    payload =>
                        payloads.push(
                            payload
                        )
                ),
            receiverParticipant: {
                character_id:
                    "receiver"
            },
            senderCharacter: {
                proxy_name:
                    "Vega"
            },
            content:
                "Coucou <3",
            publicGuildId:
                "guild",
            publicChannelId:
                "channel",
            webhookMessageId:
                "message"
        });

        assert.match(
            payloads[0].content,
            /https:\/\/discord\.com\/channels\/guild\/channel\/message/
        );

        assert.match(
            payloads[0].content,
            /Ouvrir le SMS dans le salon/
        );
    }
);

test(
    "une notification sans message publié reste lisible sans lien invalide",
    async () => {
        const payloads = [];

        const service =
            createService();

        await service.notifyNewSms({
            client:
                createClient(
                    payload =>
                        payloads.push(
                            payload
                        )
                ),
            receiverParticipant: {
                character_id:
                    "receiver"
            },
            senderCharacter: {
                proxy_name:
                    "Vega"
            },
            content:
                "Coucou <3"
        });

        assert.doesNotMatch(
            payloads[0].content,
            /discord\.com\/channels/
        );
    }
);

test(
    "la notification précise le nom de la conversation de groupe",
    async () => {
        const payloads = [];

        const service =
            createService();

        await service.notifyNewSms({
            client:
                createClient(
                    payload =>
                        payloads.push(payload)
                ),
            receiverParticipant: {
                character_id:
                    "receiver"
            },
            senderCharacter: {
                proxy_name:
                    "Vega"
            },
            content:
                "Coucou <3",
            conversationName:
                "La bande"
        });

        assert.match(
            payloads[0].content,
            /dans \*\*La bande\*\*/
        );
    }
);

function createService() {
    stubModule(
        "src/v2/managers/CharacterV2Manager.js",
        {
            getById:
                () => ({
                    discord_user_id:
                        "receiver-user"
                })
        }
    );

    const servicePath =
        require.resolve(
            "../src/v2/services/phone/PhoneNotificationService"
        );

    delete require.cache[
        servicePath
    ];

    return require(
        "../src/v2/services/phone/PhoneNotificationService"
    );
}

function createClient(
    send
) {
    return {
        users: {
            fetch:
                async () => ({
                    send:
                        async payload =>
                            send(
                                payload
                            )
                })
        }
    };
}
