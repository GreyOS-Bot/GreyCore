const test = require("node:test");
const assert = require("node:assert/strict");

function loadManager() {
    const managerPath = require.resolve(
        "../src/webhooks/webhookManager"
    );
    delete require.cache[managerPath];
    return require(managerPath);
}

function discordError(code, message = "Discord error") {
    const error = new Error(message);
    error.code = code;
    return error;
}

function webhook({
    id,
    ownerId = "greycore",
    name = "Greycore Proxy",
    createdTimestamp = null,
    send = async () => ({ id: `message-${id}` })
}) {
    return {
        id,
        owner: { id: ownerId },
        name,
        createdTimestamp,
        send
    };
}

function channel({
    batches = [[]],
    createdWebhook = null,
    createError = null
} = {}) {
    let fetchIndex = 0;
    const calls = [];
    const currentChannel = {
        id: "channel",
        client: { user: { id: "greycore" } },
        isThread: () => false,
        fetchWebhooks: async () => {
            calls.push("fetch");
            const batch = batches[
                Math.min(fetchIndex, batches.length - 1)
            ];
            fetchIndex += 1;
            if (batch instanceof Error) throw batch;
            return new Map(batch.map(item => [item.id, item]));
        },
        createWebhook: async payload => {
            calls.push(["create", payload]);
            if (createError) throw createError;
            return createdWebhook;
        }
    };
    return { currentChannel, calls };
}

test(
    "la résolution réutilise uniquement le plus ancien webhook GreyCore compatible",
    async () => {
        const manager = loadManager();
        const thirdParty = webhook({
            id: "50",
            ownerId: "other-bot"
        });
        const pluralKit = webhook({
            id: "40",
            ownerId: "pluralkit",
            name: "PluralKit Proxy"
        });
        const newest = webhook({
            id: "30",
            createdTimestamp: 300
        });
        const oldest = webhook({
            id: "20",
            createdTimestamp: 200
        });
        const fixture = channel({
            batches: [[thirdParty, newest, pluralKit, oldest]]
        });

        const resolved = await manager.getOrCreateWebhook(
            fixture.currentChannel
        );

        assert.equal(resolved, oldest);
        assert.deepEqual(fixture.calls, ["fetch"]);
    }
);

test(
    "la résolution crée un webhook GreyCore lorsqu'aucun candidat valide n'existe",
    async () => {
        const manager = loadManager();
        const created = webhook({ id: "60" });
        const fixture = channel({
            batches: [[
                webhook({ id: "10", ownerId: "pluralkit" }),
                webhook({ id: "11", name: "Autre nom" })
            ]],
            createdWebhook: created
        });

        assert.equal(
            await manager.getOrCreateWebhook(
                fixture.currentChannel
            ),
            created
        );
        assert.deepEqual(fixture.calls, [
            "fetch",
            [
                "create",
                {
                    name: "Greycore Proxy",
                    reason: "Webhook proxy Greycore"
                }
            ]
        ]);
    }
);

test(
    "un premier 10015 provoque une seule nouvelle résolution et conserve le thread",
    async () => {
        const manager = loadManager();
        const sent = [];
        const first = webhook({
            id: "100",
            send: async payload => {
                sent.push(["first", payload]);
                throw discordError(10015, "Unknown Webhook");
            }
        });
        const second = webhook({
            id: "200",
            send: async payload => {
                sent.push(["second", payload]);
                return { id: "message-200" };
            }
        });
        const parent = channel({
            batches: [[first], [first, second]]
        });
        const thread = {
            id: "thread",
            parent: parent.currentChannel,
            isThread: () => true
        };

        const result = await manager.sendWithWebhook(
            thread,
            { content: "Bonjour" }
        );

        assert.equal(result.webhook, second);
        assert.equal(result.webhookMessage.id, "message-200");
        assert.deepEqual(parent.calls, ["fetch", "fetch"]);
        assert.deepEqual(sent, [
            ["first", { content: "Bonjour", threadId: "thread" }],
            ["second", { content: "Bonjour", threadId: "thread" }]
        ]);
    }
);

test(
    "deux erreurs 10015 arrêtent le traitement après deux envois",
    async () => {
        const manager = loadManager();
        let sends = 0;
        const failing = id => webhook({
            id,
            send: async () => {
                sends += 1;
                throw discordError(10015, "Unknown Webhook");
            }
        });
        const first = failing("100");
        const second = failing("200");
        const fixture = channel({
            batches: [[first], [first, second]]
        });

        await assert.rejects(
            manager.sendWithWebhook(
                fixture.currentChannel,
                { content: "Bonjour" }
            ),
            error => {
                assert.equal(
                    error.webhookDiagnostic.kind,
                    "UNKNOWN_WEBHOOK"
                );
                return true;
            }
        );
        assert.equal(sends, 2);
        assert.deepEqual(fixture.calls, ["fetch", "fetch"]);
    }
);

test(
    "une erreur réseau ambiguë ne relance ni résolution ni envoi",
    async () => {
        const manager = loadManager();
        let sends = 0;
        const networkError = new TypeError("network failure");
        const first = webhook({
            id: "100",
            send: async () => {
                sends += 1;
                throw networkError;
            }
        });
        const fixture = channel({ batches: [[first]] });

        await assert.rejects(
            manager.sendWithWebhook(
                fixture.currentChannel,
                { content: "Bonjour" }
            ),
            error => {
                assert.equal(
                    error.webhookDiagnostic.kind,
                    "WEBHOOK_ERROR"
                );
                return true;
            }
        );
        assert.equal(sends, 1);
        assert.deepEqual(fixture.calls, ["fetch"]);
    }
);

test(
    "les limites, permissions et accès sont classifiés sans retry",
    async () => {
        const manager = loadManager();
        const expectations = new Map([
            [30007, "WEBHOOK_LIMIT_REACHED"],
            [50013, "MISSING_PERMISSIONS"],
            [50001, "MISSING_ACCESS"]
        ]);

        for (const [code, kind] of expectations) {
            const error = discordError(code);
            const diagnostic =
                manager.classifyWebhookError(error);
            assert.equal(diagnostic.kind, kind);
            assert.equal(diagnostic.retryable, false);
        }
    }
);

test(
    "le contrat personnalisé signale chaque véritable tentative et conserve le payload",
    async () => {
        const manager = loadManager();
        const attempts = [];
        const before = [];
        const first = webhook({ id: "100" });
        const second = webhook({ id: "200" });
        const parent = channel({
            batches: [[first], [first, second]]
        });
        const thread = {
            id: "thread",
            parent: parent.currentChannel,
            isThread: () => true
        };
        const payload = {
            content: "Message",
            files: [{ attachment: "image" }]
        };

        const result = await manager.sendWithWebhook(
            thread,
            payload,
            {
                onBeforeSendAttempt: current => {
                    before.push(current.id);
                },
                sendAttempt: async (current, prepared) => {
                    attempts.push([current.id, prepared]);
                    if (current === first) {
                        throw discordError(10015);
                    }
                    return { id: "message-200" };
                }
            }
        );

        assert.equal(result.webhook, second);
        assert.deepEqual(before, ["100", "200"]);
        assert.deepEqual(attempts, [
            ["100", { ...payload, threadId: "thread" }],
            ["200", { ...payload, threadId: "thread" }]
        ]);
    }
);

test(
    "une erreur de résolution survient avant toute tentative externe",
    async () => {
        const manager = loadManager();
        let attempts = 0;
        const fixture = channel({
            batches: [discordError(50013)]
        });

        await assert.rejects(
            manager.sendWithWebhook(
                fixture.currentChannel,
                { content: "Message" },
                {
                    onBeforeSendAttempt: () => {
                        attempts += 1;
                    }
                }
            ),
            error =>
                error.webhookDiagnostic.kind
                === "MISSING_PERMISSIONS"
        );
        assert.equal(attempts, 0);
    }
);
