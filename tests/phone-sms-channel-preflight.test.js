const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "un canal SMS inaccessible avant envoi supprime la ligne locale préparée",
    async () => {
        for (const code of [10003, 50001, 50013]) {
            const created = [];
            const deleted = [];

            stubModule("src/webhooks/webhookManager.js", {
                sendWithWebhook: async () => {
                    const error = new Error("Discord refuse");
                    error.code = code;
                    throw error;
                }
            });
            stubModule("src/v2/managers/PhoneV2Manager.js", {
                getConversationById: () => ({
                    id: 40,
                    conversation_type: "private"
                }),
                createMessage: () => {
                    created.push(code);
                    return { id: code };
                },
                deleteMessage: id => deleted.push(id)
            });
            stubModule(
                "src/v2/managers/PhoneConversationV2Manager.js",
                {
                    getParticipants: () => [
                        { phone_id: 10, character_id: "sender" },
                        {
                            phone_id: 20,
                            character_id: "receiver",
                            character_name: "Alba"
                        }
                    ]
                }
            );
            stubModule("src/v2/managers/PhoneActionV2Manager.js", {
                smsButtons: () => []
            });
            stubModule(
                "src/v2/services/phone/PhoneNotificationService.js",
                { notifyNewSms: async () => null }
            );
            stubModule("src/v2/core/services/TechnicalLogger.js", {
                create: () => ({ warn: () => null })
            });

            const servicePath = require.resolve(
                "../src/v2/services/phone/PhoneService"
            );
            delete require.cache[servicePath];
            const service = require(servicePath);

            await assert.rejects(
                service.sendSms({
                    guildId: "guild",
                    channel: {
                        id: "channel",
                        isTextBased: () => true
                    },
                    senderCharacter: {
                        id: "sender",
                        name: "Vega"
                    },
                    senderPhone: { id: 10 },
                    conversationId: 40,
                    content: "Bonjour"
                }),
                error => Number(error.code) === code
            );

            assert.deepEqual(created, [code]);
            assert.deepEqual(deleted, [code]);
        }
    }
);
