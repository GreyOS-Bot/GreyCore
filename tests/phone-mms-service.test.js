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
    "un MMS publie le GIF, conserve son URL et notifie le destinataire",
    async () => {
        let createdMessage = null;
        let publication = null;
        let webhookPayload = null;
        const notifications = [];

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getConversationById:
                    () => ({
                        id: 40,
                        conversation_type: "private"
                    }),
                createMessage:
                    data => {
                        createdMessage = data;
                        return { id: 50 };
                    },
                updateMessagePublication:
                    (messageId, data) => {
                        publication = {
                            messageId,
                            ...data
                        };
                        return {
                            id: messageId,
                            ...data
                        };
                    },
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
                            character_id: "receiver",
                            character_name: "Alba"
                        }
                    ],
                getDisplayName:
                    () => "Alba"
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
                                return {
                                    id: "webhook-message",
                                    attachments: {
                                        first:
                                            () => ({
                                                url: "https://cdn.example/mms.gif"
                                            })
                                    }
                                };
                            },
                        deleteMessage:
                            async () => null
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneActionV2Manager.js",
            {
                smsButtons:
                    () => []
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

        await service.sendMms({
            client: {},
            guildId: "guild",
            channel: {
                id: "channel",
                isTextBased:
                    () => true
            },
            senderCharacter: {
                display_name: "Vega affichée",
                proxy_name: "Vega",
                avatar_url: null
            },
            senderPhone: {
                id: 10
            },
            conversationId: 40,
            content: "Regarde ça",
            mediaUrl: "https://cdn.example/source.gif",
            mediaContentType: "image/gif",
            mediaName: "reaction.gif"
        });

        assert.equal(
            createdMessage.messageType,
            "mms"
        );

        assert.equal(
            createdMessage.mediaUrl,
            "https://cdn.example/source.gif"
        );

        assert.match(
            webhookPayload.content,
            /MMS à Alba/
        );

        assert.equal(
            webhookPayload.username,
            "Vega affichée"
        );

        assert.deepEqual(
            webhookPayload.files,
            [
                {
                    attachment:
                        "https://cdn.example/source.gif",
                    name: "reaction.gif"
                }
            ]
        );

        assert.equal(
            publication.mediaUrl,
            "https://cdn.example/mms.gif"
        );

        assert.equal(
            notifications.length,
            1
        );

        assert.equal(
            notifications[0].messageType,
            "mms"
        );

        assert.equal(
            notifications[0].content,
            "Regarde ça"
        );
    }
);
