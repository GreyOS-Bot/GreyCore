const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

function discordError(code) {
    const error = new Error("Discord failure");
    error.code = code;
    return error;
}

function loadService() {
    const path = require.resolve(
        "../src/v2/core/services/ProxyHistoricalWebhookService"
    );
    delete require.cache[path];
    return require(path);
}

function normalChannel(client = null) {
    return {
        id: "channel",
        client,
        isThread: () => false
    };
}

test(
    "le service historique édite sans créer ni envoyer un nouveau message",
    async () => {
        const service = loadService();
        const calls = [];
        const client = {
            fetchWebhook: async id => {
                calls.push(["fetch", id]);
                return {
                    editMessage: async (messageId, payload) => {
                        calls.push(["edit", messageId, payload]);
                    }
                };
            }
        };

        const result = await service.edit({
            client,
            channel: normalChannel(client),
            webhookId: "historical-webhook",
            webhookMessageId: "historical-message",
            payload: { content: "Modifié" }
        });

        assert.equal(result.status, "success");
        assert.deepEqual(calls, [
            ["fetch", "historical-webhook"],
            ["edit", "historical-message", { content: "Modifié" }]
        ]);
    }
);

test(
    "les échecs d'édition historiques sont classifiés sans recréation ni retry",
    async () => {
        const service = loadService();
        const cases = [
            { code: 10008, phase: "edit", status: "message_missing" },
            { code: 10015, phase: "fetch", status: "webhook_missing" },
            { code: 50001, phase: "fetch", status: "missing_access" },
            { code: 50013, phase: "fetch", status: "missing_permissions" },
            { code: null, phase: "edit", status: "discord_error" }
        ];

        for (const current of cases) {
            let fetches = 0;
            let edits = 0;
            const failure = current.code == null
                ? new TypeError("network failure")
                : discordError(current.code);
            const client = {
                fetchWebhook: async () => {
                    fetches += 1;
                    if (current.phase === "fetch") throw failure;
                    return {
                        editMessage: async () => {
                            edits += 1;
                            throw failure;
                        }
                    };
                }
            };

            const result = await service.edit({
                client,
                channel: normalChannel(client),
                webhookId: "historical-webhook",
                webhookMessageId: "historical-message",
                payload: { content: "Modifié" }
            });

            assert.equal(result.status, current.status);
            assert.equal(fetches, 1);
            assert.equal(edits, current.phase === "edit" ? 1 : 0);
        }
    }
);

test(
    "la suppression historique transmet directement le Snowflake du thread",
    async () => {
        const service = loadService();
        const calls = [];
        const client = {
            fetchWebhook: async () => ({
                deleteMessage: async (...args) => calls.push(args)
            })
        };
        const thread = {
            id: "thread-id",
            client,
            isThread: () => true
        };

        const result = await service.delete({
            client,
            channel: thread,
            webhookId: "historical-webhook",
            webhookMessageId: "historical-message"
        });

        assert.equal(result.status, "success");
        assert.deepEqual(calls, [[
            "historical-message",
            "thread-id"
        ]]);
    }
);

test(
    "les messages utilisateur distinguent message, webhook, accès et permissions",
    () => {
        const service = loadService();
        const statuses = [
            "message_missing",
            "webhook_missing",
            "missing_access",
            "missing_permissions",
            "discord_error"
        ];
        const messages = statuses.map(status =>
            service.userMessage({ status }, "edit")
        );

        assert.equal(new Set(messages).size, statuses.length);
        for (const message of messages) {
            assert.doesNotMatch(message, /10008|10015|50001|50013/);
        }
    }
);

test(
    "la commande supprime la ligne seulement après succès ou message déjà absent",
    async () => {
        for (const status of [
            "success",
            "message_missing",
            "webhook_missing",
            "missing_access",
            "missing_permissions",
            "discord_error"
        ]) {
            const deleted = [];
            stubModule("src/managers/ProxyMessageManager.js", {
                getByWebhookMessageId: () => ({
                    discord_message_id: "source",
                    webhook_message_id: "proxy",
                    webhook_id: "webhook",
                    author_id: "owner"
                }),
                delete: id => deleted.push(id)
            });
            stubModule("src/v2/core/services/ProxyHistoricalWebhookService.js", {
                delete: async () => ({
                    success: status === "success",
                    status
                }),
                userMessage: result => result.status
            });
            const path = require.resolve(
                "../src/commands/proxy/supprimerMessage"
            );
            delete require.cache[path];
            const command = require(path);
            const interaction = {
                targetMessage: {
                    id: "proxy",
                    channel: normalChannel()
                },
                user: { id: "owner" },
                client: {},
                deferReply: async () => {},
                editReply: async () => {}
            };

            await command.execute(interaction);
            assert.deepEqual(
                deleted,
                ["success", "message_missing"].includes(status)
                    ? ["source"]
                    : []
            );
        }
    }
);

test(
    "la suppression événementielle conserve la ligne lorsque le webhook est absent",
    async () => {
        const deleted = [];
        const warnings = [];
        stubModule("src/managers/ProxyMessageManager.js", {
            get: () => ({
                webhook_message_id: "proxy",
                webhook_id: "webhook",
                channel_id: "channel"
            }),
            delete: id => deleted.push(id)
        });
        stubModule("src/services/internalDeleteService.js", {
            consumeInternalDelete: () => false
        });
        stubModule("src/v2/core/services/ProxyHistoricalWebhookService.js", {
            delete: async () => ({
                success: false,
                status: "webhook_missing",
                discordCode: 10015
            })
        });
        stubModule("src/v2/core/services/TechnicalLogger.js", {
            create: () => ({
                warn: (...values) => warnings.push(values)
            })
        });
        const path = require.resolve(
            "../src/events/handlers/messageDelete/ProxyMessageDeleteHandler"
        );
        delete require.cache[path];
        const handler = require(path);

        assert.equal(await handler({
            id: "source",
            guild: { id: "guild" },
            author: { bot: false },
            client: {},
            channel: normalChannel()
        }), true);
        assert.deepEqual(deleted, []);
        assert.equal(warnings.length, 1);
        assert.deepEqual(warnings[0][1], {
            discordMessageId: "source",
            proxyWebhookMessageId: "proxy",
            channelId: "channel",
            classification: "webhook_missing",
            discordCode: 10015
        });
    }
);
