const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "un GIF proxifi\u00e9 conserve l'avatar du personnage",
    async () => {
        let sentPayload = null;
        const previousFetch = global.fetch;

        stubModule(
            "src/services/proxyService.js",
            {
                parseProxy: () => ({
                    character: "Reya",
                    content: ""
                })
            }
        );
        stubModule(
            "src/services/proxy/ProxyCharacterResolver.js",
            {
                resolveProxyCharacter: () => ({
                    character: {
                        id: "character",
                        name: "Reya",
                        avatar:
                            "https://image.test/reya.png"
                    }
                }),
                resolveCharacterByReference:
                    () => null
            }
        );
        stubModule(
            "src/managers/ProxyMessageManager.js",
            {
                claim: () => "claim",
                refreshClaim: () => ({
                    changes: 1
                }),
                completeClaim: () => true,
                releaseClaim: () => {},
                deleteIfMatches: () => ({
                    changes: 1
                })
            }
        );
        stubModule(
            "src/webhooks/webhookManager.js",
            {
                sendWithWebhook: async (
                    channel,
                    payload
                ) => {
                        sentPayload = payload;

                    return {
                        webhook: {
                            id: "webhook"
                        },
                        webhookMessage: {
                            id: "message"
                        }
                    };
                }
            }
        );
        stubModule(
            "src/services/internalDeleteService.js",
            {
                markInternalDelete: () => {}
            }
        );
        stubModule(
            "src/v2/core/services/StaffPermissionDecisionService.js",
            {
                decide: () => ({ allowed: false })
            }
        );

        global.fetch = async () => ({
            ok: true,
            arrayBuffer: async () =>
                Uint8Array.from([1, 2, 3]).buffer
        });

        try {
            const handlerPath =
                require.resolve(
                    "../src/events/handlers/messageCreate/ProxyMessageHandler"
                );

            delete require.cache[handlerPath];

            const proxyMessageHandler =
                require(
                    "../src/events/handlers/messageCreate/ProxyMessageHandler"
                );

            await proxyMessageHandler({
                guild: {
                    id: "guild"
                },
                content:
                    "Reya: gif",
                author: {
                    id: "user"
                },
                member: {
                    permissions: null
                },
                client: {},
                channel: {},
                id: "source-message",
                attachments: new Map([
                    [
                        "gif",
                        {
                            url:
                                "https://image.test/reaction.gif",
                            name:
                                "reaction.gif"
                        }
                    ]
                ]),
                delete: async () => {}
            });
        } finally {
            global.fetch = previousFetch;
        }

        assert.equal(
            sentPayload.avatarURL,
            "https://image.test/reya.png"
        );
        assert.equal(
            sentPayload.files[0].name,
            "reaction.gif"
        );
    }
);
