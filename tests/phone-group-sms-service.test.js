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
    "un SMS de groupe est publié pour le groupe et notifie chaque autre personnage",
    async () => {
        const notifications = [];
        let webhookPayload = null;

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getConversationById:
                    () => ({
                        id: 40,
                        conversation_type: "group",
                        name: "La bande"
                    }),
                createMessage:
                    () => ({ id: 50 }),
                updateMessagePublication:
                    () => ({ id: 50 }),
                deleteMessage:
                    () => null
            }
        );

        stubModule(
            "src/v2/managers/PhoneConversationV2Manager.js",
            {
                getParticipants:
                    () => [
                        {
                            phone_id: 10,
                            character_id: "sender"
                        },
                        {
                            phone_id: 20,
                            character_id: "receiver-one"
                        },
                        {
                            phone_id: 30,
                            character_id: "receiver-two"
                        }
                    ],
                getDisplayName:
                    () => "La bande"
            }
        );

        stubModule(
            "src/webhooks/webhookManager.js",
            {
                getOrCreateWebhook:
                    async () => ({
                        send:
                            async payload => {
                                webhookPayload = payload;
                                return { id: "webhook-message" };
                            },
                        deleteMessage:
                            async () => null
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneActionV2Manager.js",
            {
                groupReplyButtons:
                    conversationId => ({
                        kind: "group-reply",
                        conversationId
                    })
            }
        );

        stubModule(
            "src/v2/services/phone/PhoneNotificationService.js",
            {
                notifyNewSms:
                    async data =>
                        notifications.push(data)
            }
        );

        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create:
                    () => ({
                        warn:
                            () => null
                    })
            }
        );

        const servicePath =
            require.resolve(
                "../src/v2/services/phone/PhoneService"
            );

        delete require.cache[servicePath];

        const service =
            require(
                "../src/v2/services/phone/PhoneService"
            );

        await service.sendSms({
            client: {},
            guildId: "guild",
            channel: {
                id: "channel",
                isTextBased:
                    () => true
            },
            senderCharacter: {
                proxy_name: "Vega",
                avatar_url: null
            },
            senderPhone: {
                id: 10
            },
            conversationId: 40,
            content: "Coucou <3"
        });

        assert.match(
            webhookPayload.content,
            /SMS dans La bande/
        );

        assert.deepEqual(webhookPayload.components, [{
            kind: "group-reply",
            conversationId: 40
        }]);

        assert.equal(
            notifications.length,
            2
        );

        assert.deepEqual(
            notifications.map(
                notification =>
                    notification.receiverParticipant
                        .character_id
            ),
            [
                "receiver-one",
                "receiver-two"
            ]
        );

        assert.ok(
            notifications.every(
                notification =>
                    notification.conversationName ===
                    "La bande"
            )
        );
    }
);
