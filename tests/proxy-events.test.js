const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "un proxy V2 peut être modifié puis supprimé",
    async () => {
        const calls = [];

        const proxyRecord = {
            character_id:
                "v2-character",
            character_version:
                "v2",
            channel_id:
                "channel",
            webhook_id:
                "webhook",
            webhook_message_id:
                "webhook-message"
        };

        stubModule(
            "src/services/proxyService.js",
            {
                parseProxy: () => ({
                    character: "Alba",
                    content: "Modifié"
                })
            }
        );

        stubModule(
            "src/services/proxy/ProxyCharacterResolver.js",
            {
                resolveProxyCharacter:
                    () => ({
                        character: {
                            id:
                                "v2-character"
                        }
                    }),
                matchesCharacterReference:
                    (
                        character,
                        reference
                    ) =>
                        character.id ===
                            reference.characterId
                        &&
                        reference
                            .characterVersion ===
                            "v2"
            }
        );

        stubModule(
            "src/managers/ProxyMessageManager.js",
            {
                get: () =>
                    proxyRecord,
                delete: messageId =>
                    calls.push([
                        "record.delete",
                        messageId
                    ])
            }
        );

        stubModule(
            "src/services/internalDeleteService.js",
            {
                consumeInternalDelete:
                    () => false
            }
        );

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
                        payload.content
                    ]);
                },
            deleteMessage:
                async messageId => {
                    calls.push([
                        "webhook.delete",
                        messageId
                    ]);
                }
        };

        const message =
            createProxyMessage(
                webhook
            );

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
                    "webhook-message",
                    "Modifié"
                ],
                [
                    "webhook.delete",
                    "webhook-message"
                ],
                [
                    "record.delete",
                    "original-message"
                ]
            ]
        );
    }
);

function createProxyMessage(
    webhook
) {
    const client = {
        fetchWebhook:
            async () => webhook
    };

    return {
        id:
            "original-message",
        content:
            "Alba: Modifié",
        author: {
            id: "user",
            bot: false
        },
        guild: {
            id: "guild",
            channels: {
                cache: new Map([
                    [
                        "channel",
                        {
                            client
                        }
                    ]
                ])
            }
        },
        client
    };
}
