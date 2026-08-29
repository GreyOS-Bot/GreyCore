const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    MessageFlags
} = require("discord.js");

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "le propriétaire peut modifier son message proxy V1 ou V2",
    async () => {
        const calls = [];

        const handler =
            loadHandler({
                get:
                    () => ({
                        author_id:
                            "owner",
                        channel_id:
                            "channel",
                        webhook_id:
                            "webhook",
                        webhook_message_id:
                            "webhook-message"
                    })
            });

        const interaction =
            createInteraction({
                fetchWebhook:
                    async webhookId => {
                        calls.push([
                            "webhook",
                            webhookId
                        ]);

                        return {
                            editMessage:
                                async (
                                    messageId,
                                    payload
                                ) => {
                                    calls.push([
                                        "edit",
                                        messageId,
                                        payload
                                    ]);
                                }
                        };
                    }
            });

        await handler(
            interaction
        );

        assert.deepEqual(
            calls,
            [
                [
                    "webhook",
                    "webhook"
                ],
                [
                    "edit",
                    "webhook-message",
                    {
                        content:
                            "Nouveau message"
                    }
                ]
            ]
        );

        assert.equal(
            interaction
                .replied
                .flags,
            MessageFlags.Ephemeral
        );
    }
);

test(
    "un joueur ne peut pas modifier le message proxy d’un autre",
    async () => {
        let webhookFetchCount =
            0;

        const handler =
            loadHandler({
                get:
                    () => ({
                        author_id:
                            "other-owner"
                    })
            });

        const interaction =
            createInteraction({
                fetchWebhook:
                    async () => {
                        webhookFetchCount +=
                            1;
                    }
            });

        await handler(
            interaction
        );

        assert.match(
            interaction
                .replied
                .content,
            /propres messages/
        );
        assert.equal(
            webhookFetchCount,
            0
        );
    }
);

function loadHandler(
    proxyMessageManager
) {
    stubModule(
        "src/managers/ProxyMessageManager.js",
        proxyMessageManager
    );

    const handlerPath =
        require.resolve(
            "../src/v2/interactions/modals/editProxyMessage"
        );

    delete require.cache[
        handlerPath
    ];

    return require(
        "../src/v2/interactions/modals/editProxyMessage"
    );
}

function createInteraction({
    fetchWebhook
}) {
    return {
        customId:
            "proxy_edit_modal:discord-message",
        user: {
            id:
                "owner"
        },
        fields: {
            getTextInputValue:
                () =>
                    "  Nouveau message  "
        },
        client: {
            fetchWebhook
        },
        channel: {
            id:
                "channel",
            isThread:
                () => false
        },
        inGuild:
            () => true,
        reply:
            async function (
                payload
            ) {
                this.replied =
                    payload;
            }
    };
}
