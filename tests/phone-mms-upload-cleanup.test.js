const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "un MMS réussi supprime son message source sans confirmation supplémentaire",
    async () => {
        const order = [];

        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                delete: () => {
                    order.push("pending-deleted");
                }
            }
        );
        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById: () => ({
                    id: "character",
                    discord_user_id: "owner"
                })
            }
        );
        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getPlayableDashboardData: () => ({
                    continuity: {
                        id: "continuity"
                    }
                })
            }
        );
        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getPhoneByContinuity: () => ({
                    id: "phone"
                }),
                getConversationById: () => ({
                    id: "conversation"
                }),
                deleteMessage: () => null
            }
        );
        stubModule(
            "src/v2/managers/PhoneConversationV2Manager.js",
            {
                isParticipant: () => true
            }
        );
        stubModule(
            "src/v2/services/phone/PhoneService.js",
            {
                sendMms: async () => {
                    order.push("mms-sent");

                    return {
                        message: {
                            id: "phone-message"
                        },
                        webhookMessage: {
                            delete: async () => null
                        }
                    };
                }
            }
        );
        stubModule(
            "src/v2/core/services/OriginalMessageDeletionService.js",
            {
                delete: async () => {
                    order.push("source-deleted");
                }
            }
        );
        stubModule(
            "src/events/handlers/messageCreate/uploads/ImageAttachment.js",
            {
                getImageAttachment: async () => ({
                    url: "https://image.test/mms.png",
                    contentType: "image/png",
                    name: "mms.png"
                })
            }
        );

        const handlerPath = require.resolve(
            "../src/events/handlers/messageCreate/uploads/PhoneMmsUploadHandler"
        );
        delete require.cache[handlerPath];
        const handler = require(
            "../src/events/handlers/messageCreate/uploads/PhoneMmsUploadHandler"
        );
        let replyCount = 0;

        await handler(
            {
                author: {
                    id: "owner"
                },
                guild: {
                    id: "guild"
                },
                channel: {
                    id: "channel"
                },
                client: {},
                content: "Regarde ça",
                reply: async () => {
                    replyCount += 1;
                }
            },
            {
                characterId: "character",
                continuityId: "continuity",
                conversationId: "conversation"
            }
        );

        assert.deepEqual(
            order,
            [
                "mms-sent",
                "source-deleted",
                "pending-deleted"
            ]
        );
        assert.equal(replyCount, 0);
    }
);
