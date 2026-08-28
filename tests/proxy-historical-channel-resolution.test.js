const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ChannelType
} = require("discord.js");

function discordError(code) {
    const error = new Error("Discord failure");
    error.code = code;
    return error;
}

function loadService() {
    for (const modulePath of [
        "../src/v2/core/services/ProxyHistoricalWebhookService",
        "../src/v2/core/services/DiscordChannelDiagnosticService",
        "../src/v2/core/services/DiscordThreadAccessService"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }

    return require(
        "../src/v2/core/services/ProxyHistoricalWebhookService"
    );
}

test(
    "le canal courant est réutilisé uniquement s'il correspond à la référence historique",
    async () => {
        const service = loadService();
        const historical = normalChannel("historical");
        const other = normalChannel("other");
        let fetches = 0;

        const exact = await service.resolveHistoricalChannel({
            client: {
                channels: {
                    fetch: async () => {
                        fetches += 1;
                    }
                }
            },
            channelId: historical.id,
            currentChannel: historical
        });

        assert.equal(exact.channel, historical);
        assert.equal(fetches, 0);

        const absent = await service.resolveHistoricalChannel({
            client: {
                channels: {
                    fetch: async id => {
                        fetches += 1;
                        assert.equal(id, historical.id);
                        throw discordError(10003);
                    }
                }
            },
            channelId: historical.id,
            currentChannel: other
        });

        assert.equal(absent.status, "unknown_channel");
        assert.equal(absent.channel, undefined);
        assert.equal(fetches, 1);
    }
);

test(
    "un cache incomplet déclenche un fetch ciblé du canal historique",
    async () => {
        const service = loadService();
        const cached = normalChannel("cached");
        const fetched = normalChannel("fetched");
        const calls = [];
        const guild = {
            channels: {
                cache: new Map([[cached.id, cached]]),
                fetch: async id => {
                    calls.push(id);
                    return fetched;
                }
            }
        };

        const cacheResult =
            await service.resolveHistoricalChannel({
                guild,
                channelId: cached.id,
                currentChannel: normalChannel("other")
            });
        assert.equal(cacheResult.channel, cached);
        assert.deepEqual(calls, []);

        const fetchResult =
            await service.resolveHistoricalChannel({
                guild,
                channelId: fetched.id,
                currentChannel: normalChannel("other")
            });
        assert.equal(fetchResult.channel, fetched);
        assert.deepEqual(calls, [fetched.id]);
    }
);

test(
    "les erreurs du fetch historique sont classifiées sans webhook ni autre destination",
    async () => {
        const service = loadService();

        for (const [code, status] of [
            [10003, "unknown_channel"],
            [50001, "missing_access"],
            [50013, "missing_permissions"],
            [59999, "discord_error"]
        ]) {
            let webhookFetches = 0;
            const result = await service.edit({
                client: {
                    channels: {
                        fetch: async id => {
                            assert.equal(id, "historical");
                            throw discordError(code);
                        }
                    },
                    fetchWebhook: async () => {
                        webhookFetches += 1;
                    }
                },
                channelId: "historical",
                currentChannel: normalChannel("other"),
                webhookId: "webhook",
                webhookMessageId: "message",
                payload: { content: "modification" }
            });

            assert.equal(result.status, status);
            assert.equal(result.discordCode, code);
            assert.equal(webhookFetches, 0);
        }
    }
);

test(
    "un thread historique conserve son ID et la politique archivé-verrouillé",
    async () => {
        const service = loadService();
        const locked = historicalThread({ locked: true });
        let webhookFetches = 0;
        const client = {
            fetchWebhook: async () => {
                webhookFetches += 1;
                return {
                    deleteMessage: async () => null
                };
            }
        };

        const lockedResult = await service.delete({
            client,
            channelId: locked.id,
            currentChannel: locked,
            webhookId: "webhook",
            webhookMessageId: "message"
        });
        assert.equal(lockedResult.status, "locked");
        assert.equal(webhookFetches, 0);
        assert.deepEqual(locked.calls, []);

        const archived = historicalThread({ archived: true });
        const deleted = [];
        client.fetchWebhook = async () => ({
            deleteMessage: async (...args) => deleted.push(args)
        });

        const archivedResult = await service.delete({
            client,
            channelId: archived.id,
            currentChannel: normalChannel("other"),
            guild: {
                channels: {
                    cache: new Map([[archived.id, archived]])
                }
            },
            webhookId: "webhook",
            webhookMessageId: "message"
        });

        assert.equal(archivedResult.status, "success");
        assert.deepEqual(archived.calls, [["setArchived", false]]);
        assert.deepEqual(deleted, [["message", archived.id]]);
    }
);

test(
    "les messages historiques distinguent canal, accès, permissions et verrou",
    () => {
        const service = loadService();
        const statuses = [
            "unknown_channel",
            "missing_access",
            "missing_permissions",
            "locked",
            "message_missing",
            "webhook_missing"
        ];

        for (const action of ["edit", "delete"]) {
            const messages = statuses.map(status =>
                service.userMessage({ status }, action)
            );
            assert.equal(new Set(messages).size, statuses.length);
            for (const message of messages) {
                assert.doesNotMatch(
                    message,
                    /10003|50001|50013|10008|10015/
                );
            }
        }
    }
);

function normalChannel(id) {
    return {
        id,
        isThread: () => false
    };
}

function historicalThread(options = {}) {
    const calls = [];
    const channel = {
        id: "historical-thread",
        type: ChannelType.PublicThread,
        parent: {
            id: "historical-parent",
            type: ChannelType.GuildText
        },
        parentId: "historical-parent",
        archived: Boolean(options.archived),
        locked: Boolean(options.locked),
        calls,
        isThread: () => true,
        isTextBased: () => true,
        setArchived: async value => {
            calls.push(["setArchived", value]);
            channel.archived = value;
            return channel;
        }
    };
    return channel;
}
