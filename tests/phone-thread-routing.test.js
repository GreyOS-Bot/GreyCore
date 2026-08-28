const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ChannelType
} = require("discord.js");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le Téléphone conserve le thread pour tous les envois, réponses et éditions webhook",
    async () => {
        const sent = [];
        const deleted = [];
        const edited = [];
        const fetched = [];
        const resolvedWebhookChannels = [];
        const restCalls = [];
        let publicationMustFail = false;

        const webhook = {
            id: "webhook",
            token: "token",
            send: async payload => {
                sent.push(payload);
                return {
                    id: `message-${sent.length}`,
                    attachments: {
                        first: () => ({
                            url: "https://cdn.example/image.gif"
                        })
                    }
                };
            },
            deleteMessage: async (...args) => {
                deleted.push(args);
            },
            editMessage: async (...args) => {
                edited.push(args);
            },
            fetchMessage: async (...args) => {
                fetched.push(args);
                return { id: args[0] };
            }
        };

        stubModule("src/webhooks/webhookManager.js", {
            getOrCreateWebhook: async channel => {
                resolvedWebhookChannels.push(
                    channel.isThread()
                        ? channel.parent
                        : channel
                );
                return webhook;
            }
        });
        stubModule("src/v2/managers/PhoneV2Manager.js", {
            getConversationById: () => ({
                id: 40,
                conversation_type: "private"
            }),
            createMessage: () => ({ id: 50 }),
            updateMessagePublication: () => {
                if (publicationMustFail) {
                    throw new Error("publication impossible");
                }
                return { id: 50 };
            },
            deleteMessage: () => null
        });
        stubModule(
            "src/v2/managers/PhoneConversationV2Manager.js",
            {
                getParticipants: () => [
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
                getDisplayName: () => "Alba"
            }
        );
        stubModule("src/v2/managers/PhoneActionV2Manager.js", {
            smsButtons: () => [],
            groupReplyButtons: () => []
        });
        stubModule(
            "src/v2/services/phone/PhoneNotificationService.js",
            { notifyNewSms: async () => null }
        );
        stubModule("src/v2/core/services/TechnicalLogger.js", {
            create: () => ({ warn: () => null })
        });

        const sessions = new Map();
        stubModule("src/v2/managers/PhoneCallSessionManager.js", {
            get: id => sessions.get(Number(id)),
            register: (id, data) => {
                const value = {
                    ...sessions.get(Number(id)),
                    ...data
                };
                sessions.set(Number(id), value);
                return value;
            }
        });

        clearPhoneServices();
        const phone = require(
            "../src/v2/services/phone/PhoneService"
        );
        const calls = require(
            "../src/v2/services/phone/PhoneCallService"
        );

        const parent = discordChannel(
            "parent",
            ChannelType.GuildText
        );
        const thread = discordChannel(
            "thread-T",
            ChannelType.PublicThread,
            parent
        );
        const forum = discordChannel(
            "forum-P",
            ChannelType.GuildForum
        );
        const forumPost = discordChannel(
            "post-T",
            ChannelType.PublicThread,
            forum
        );
        const normal = discordChannel(
            "normal",
            ChannelType.GuildText
        );

        await phone.sendSms(
            smsInput(normal, "message normal")
        );
        assert.equal(sent.at(-1).threadId, undefined);

        await phone.sendMms({
            ...smsInput(thread, "image"),
            mediaUrl: "https://cdn.example/source.gif",
            mediaContentType: "image/gif",
            mediaName: "image.gif"
        });
        assert.equal(sent.at(-1).threadId, "thread-T");
        assert.deepEqual(sent.at(-1).files, [{
            attachment: "https://cdn.example/source.gif",
            name: "image.gif"
        }]);
        assert.equal(
            resolvedWebhookChannels.at(-1),
            parent
        );

        await phone.sendSms(
            smsInput(forumPost, "dans le post")
        );
        assert.equal(sent.at(-1).threadId, "post-T");
        assert.equal(
            resolvedWebhookChannels.at(-1),
            forum
        );
        assert.equal(sent.at(-1).threadName, undefined);

        publicationMustFail = true;
        await assert.rejects(
            phone.sendSms(
                smsInput(thread, "compensation")
            ),
            /publication impossible/
        );
        publicationMustFail = false;
        assert.deepEqual(
            deleted.at(-1),
            [sent.at(-1) && `message-${sent.length}`, "thread-T"]
        );

        sessions.set(7, {
            channelId: "thread-T",
            guildId: "guild"
        });
        sessions.set(8, {
            channelId: "normal",
            guildId: "guild"
        });
        const channels = new Map([
            [thread.id, thread],
            [normal.id, normal]
        ]);
        const client = {
            channels: {
                fetch: async id => channels.get(id) || null
            },
            rest: {
                post: async (route, options) => {
                    restCalls.push({ route, options });
                    return { id: "reply-message" };
                }
            }
        };
        const speech = {
            client,
            guildId: "guild",
            callId: 7,
            channelId: "thread-T",
            character: {
                id: "speaker",
                name: "Vega"
            },
            otherCharacter: {
                id: "listener"
            },
            contactName: "Alba",
            content: "Allô"
        };

        await calls.sendSpeech(speech);
        assert.equal(sent.at(-1).threadId, "thread-T");

        await calls.sendSpeech({
            ...speech,
            content: "Tu m’entends ?"
        });
        assert.equal(
            restCalls[0].options.query.get("thread_id"),
            "thread-T"
        );
        assert.equal(
            restCalls[0].options.body.message_reference.channel_id,
            "thread-T"
        );
        assert.deepEqual(
            fetched.at(-1),
            ["reply-message", { threadId: "thread-T" }]
        );

        await calls.finalizeCall({ client, callId: 7 });
        assert.deepEqual(edited.at(-1), [
            "reply-message",
            {
                components: [],
                threadId: "thread-T"
            }
        ]);

        await calls.sendSpeech({
            ...speech,
            callId: 8,
            channelId: "normal",
            content: "Salon normal"
        });
        assert.equal(sent.at(-1).threadId, undefined);
    }
);

function smsInput(channel, content) {
    return {
        guildId: "guild",
        channel,
        senderCharacter: {
            id: "sender",
            name: "Vega"
        },
        senderPhone: { id: 10 },
        conversationId: 40,
        content
    };
}

function discordChannel(id, type, parent = null) {
    return {
        id,
        type,
        guildId: "guild",
        parent,
        parentId: parent?.id || null,
        isThread: () => [
            ChannelType.PublicThread,
            ChannelType.PrivateThread,
            ChannelType.AnnouncementThread
        ].includes(type),
        isTextBased: () => true,
        send: async () => ({ id: "direct-message" })
    };
}

function clearPhoneServices() {
    for (const modulePath of [
        "../src/v2/services/phone/PhoneService",
        "../src/v2/services/phone/PhoneCallService"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }
}
