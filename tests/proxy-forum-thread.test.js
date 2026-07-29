const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le webhook proxy est créé sur le salon parent d'un fil de forum",
    async () => {
        const calls = [];

        const webhook = {
            id: "webhook"
        };

        const parent = {
            client: {
                user: {
                    id: "greycore"
                }
            },
            fetchWebhooks:
                async () => {
                    calls.push([
                        "fetch"
                    ]);

                    return {
                        find:
                            () => null
                    };
                },
            createWebhook:
                async payload => {
                    calls.push([
                        "create",
                        payload
                    ]);

                    return webhook;
                }
        };

        const thread = {
            id: "forum-thread",
            parent,
            isThread:
                () => true
        };

        const managerPath =
            require.resolve(
                "../src/webhooks/webhookManager"
            );

        delete require.cache[
            managerPath
        ];

        const manager =
            require(
                "../src/webhooks/webhookManager"
            );

        assert.equal(
            await manager.getOrCreateWebhook(
                thread
            ),
            webhook
        );

        assert.deepEqual(
            calls,
            [
                [
                    "fetch"
                ],
                [
                    "create",
                    {
                        name:
                            "Greycore Proxy",
                        reason:
                            "Webhook proxy Greycore"
                    }
                ]
            ]
        );
    }
);

test(
    "un proxy publié dans un forum cible le fil concerné",
    async () => {
        let sourceChannel = null;
        let sentPayload = null;

        stubModule(
            "src/services/proxyService.js",
            {
                parseProxy:
                    () => ({
                        character: "Reya",
                        content: "Bonjour"
                    })
            }
        );

        stubModule(
            "src/services/proxy/ProxyCharacterResolver.js",
            {
                resolveProxyCharacter:
                    () => ({
                        character: {
                            id: "character",
                            name: "Reya",
                            avatar:
                                "https://image.test/reya.png"
                        }
                    })
            }
        );

        stubModule(
            "src/managers/ProxyMessageManager.js",
            {
                save:
                    () => true
            }
        );

        stubModule(
            "src/webhooks/webhookManager.js",
            {
                getOrCreateWebhook:
                    async channel => {
                        sourceChannel = channel;

                        return {
                            id: "webhook",
                            send:
                                async payload => {
                                    sentPayload = payload;

                                    return {
                                        id: "proxy-message"
                                    };
                                }
                        };
                    }
            }
        );

        stubModule(
            "src/services/internalDeleteService.js",
            {
                markInternalDelete:
                    () => {}
            }
        );

        stubModule(
            "src/v2/core/policies/ValidationStaffPolicy.js",
            {
                canManageServerTools:
                    () => false
            }
        );

        const handlerPath =
            require.resolve(
                "../src/events/handlers/messageCreate/ProxyMessageHandler"
            );

        delete require.cache[
            handlerPath
        ];

        const handler =
            require(
                "../src/events/handlers/messageCreate/ProxyMessageHandler"
            );

        const thread = {
            id: "forum-thread",
            isThread:
                () => true
        };

        await handler({
            guild: {
                id: "guild"
            },
            content: "Reya: Bonjour",
            author: {
                id: "user"
            },
            member: {
                permissions: null
            },
            client: {},
            channel: thread,
            id: "source-message",
            attachments: new Map(),
            delete:
                async () => {}
        });

        assert.equal(
            sourceChannel,
            thread
        );
        assert.equal(
            sentPayload.threadId,
            "forum-thread"
        );
        assert.equal(
            sentPayload.content,
            "Bonjour"
        );
    }
);

test(
    "la modification et la suppression d'un proxy gardent son fil de forum",
    async () => {
        const calls = [];

        const proxyRecord = {
            character_id: "character",
            character_version: "v2",
            channel_id: "forum-thread",
            webhook_id: "webhook",
            webhook_message_id: "proxy-message"
        };

        stubModule(
            "src/services/proxyService.js",
            {
                parseProxy:
                    () => ({
                        character: "Reya",
                        content: "Message modifié"
                    })
            }
        );

        stubModule(
            "src/services/proxy/ProxyCharacterResolver.js",
            {
                resolveProxyCharacter:
                    () => ({
                        character: {
                            id: "character"
                        }
                    }),
                matchesCharacterReference:
                    () => true
            }
        );

        stubModule(
            "src/managers/ProxyMessageManager.js",
            {
                get:
                    () => proxyRecord,
                delete:
                    messageId => {
                        calls.push([
                            "record.delete",
                            messageId
                        ]);
                    }
            }
        );

        stubModule(
            "src/services/internalDeleteService.js",
            {
                consumeInternalDelete:
                    () => false
            }
        );

        const updatePath =
            require.resolve(
                "../src/events/handlers/messageUpdate/ProxyMessageUpdateHandler"
            );

        const deletePath =
            require.resolve(
                "../src/events/handlers/messageDelete/ProxyMessageDeleteHandler"
            );

        delete require.cache[
            updatePath
        ];
        delete require.cache[
            deletePath
        ];

        const updateHandler =
            require(
                "../src/events/handlers/messageUpdate/ProxyMessageUpdateHandler"
            );

        const deleteHandler =
            require(
                "../src/events/handlers/messageDelete/ProxyMessageDeleteHandler"
            );

        const webhook = {
            editMessage:
                async (
                    messageId,
                    payload
                ) => {
                    calls.push([
                        "webhook.edit",
                        messageId,
                        payload
                    ]);
                },
            deleteMessage:
                async (
                    messageId,
                    threadId
                ) => {
                    calls.push([
                        "webhook.delete",
                        messageId,
                        threadId
                    ]);
                }
        };

        const client = {
            fetchWebhook:
                async () => webhook
        };

        const thread = {
            id: "forum-thread",
            client,
            isThread:
                () => true
        };

        const message = {
            id: "source-message",
            content: "Reya: Message modifié",
            author: {
                id: "user",
                bot: false
            },
            guild: {
                id: "guild",
                channels: {
                    cache: new Map([
                        [
                            "forum-thread",
                            thread
                        ]
                    ])
                }
            },
            channel: thread,
            client
        };

        assert.equal(
            await updateHandler(
                message
            ),
            true
        );

        const previousLog =
            console.log;

        console.log = () => {};

        try {
            assert.equal(
                await deleteHandler(
                    message
                ),
                true
            );
        } finally {
            console.log =
                previousLog;
        }

        assert.deepEqual(
            calls,
            [
                [
                    "webhook.edit",
                    "proxy-message",
                    {
                        content:
                            "Message modifié",
                        threadId:
                            "forum-thread"
                    }
                ],
                [
                    "webhook.delete",
                    "proxy-message",
                    "forum-thread"
                ],
                [
                    "record.delete",
                    "source-message"
                ]
            ]
        );
    }
);
