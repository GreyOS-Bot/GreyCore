const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ChannelType
} = require("discord.js");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "un canal sain crée puis publie la parole normalement",
    async () => {
        const fixture = phoneCallFixture({
            channel: discordChannel({ isThread: false })
        });

        const result = await fixture.service
            .sendSpeech(fixture.speech);

        assert.equal(result.id, "message");
        assert.equal(fixture.created.length, 1);
        assert.equal(fixture.sendAttempts.length, 1);
        assert.deepEqual(fixture.channelCalls, []);
    }
);

test(
    "la parole d'appel est créée seulement après validation ponctuelle du canal",
    async () => {
        for (const [code, status, message] of [
            [10003, "unknown_channel", /n’existe plus/],
            [50001, "missing_access", /n’a plus accès/],
            [50013, "missing_permissions", /permissions nécessaires/],
            [59999, "discord_error", /momentanément indisponible/]
        ]) {
            const fixture = phoneCallFixture({ fetchError: code });

            await assert.rejects(
                fixture.service.sendSpeech(fixture.speech),
                error => {
                    assert.match(error.message, message);
                    assert.equal(
                        error.phoneChannelDiagnostic.status,
                        status
                    );
                    assert.equal(
                        error.phoneChannelDiagnostic.discordCode,
                        code
                    );
                    return true;
                }
            );

            assert.equal(fixture.created.length, 0);
            assert.equal(fixture.sendAttempts.length, 0);
        }
    }
);

test(
    "un thread verrouillé refuse la parole sans ligne locale ni webhook",
    async () => {
        const fixture = phoneCallFixture({
            channel: discordChannel({ locked: true })
        });

        await assert.rejects(
            fixture.service.sendSpeech(fixture.speech),
            error => {
                assert.match(error.message, /verrouillé/);
                assert.equal(
                    error.phoneChannelDiagnostic.status,
                    "locked"
                );
                return true;
            }
        );

        assert.deepEqual(fixture.channelCalls, []);
        assert.equal(fixture.created.length, 0);
        assert.equal(fixture.sendAttempts.length, 0);
    }
);

test(
    "un thread archivé est rouvert une fois avant création et publication",
    async () => {
        const fixture = phoneCallFixture({
            channel: discordChannel({ archived: true })
        });

        await fixture.service.sendSpeech(fixture.speech);

        assert.deepEqual(fixture.channelCalls, [
            ["setArchived", false]
        ]);
        assert.equal(fixture.created.length, 1);
        assert.equal(fixture.sendAttempts.length, 1);
    }
);

test(
    "une erreur réseau après la vraie tentative conserve la parole locale",
    async () => {
        const networkError = new TypeError("network failure");
        const fixture = phoneCallFixture({ networkError });

        await assert.rejects(
            fixture.service.sendSpeech(fixture.speech),
            error => error === networkError
        );

        assert.equal(fixture.created.length, 1);
        assert.equal(fixture.sendAttempts.length, 1);
    }
);

test(
    "la fin locale de l'appel survit à un canal supprimé et nettoie la session",
    async () => {
        const order = [];
        const sessions = new Map([[40, { channelId: "missing" }]]);

        stubModule("src/v2/services/dashboard/CharacterDashboardManager.js", {
            getPlayableDashboardData: () => null
        });
        stubModule("src/v2/managers/CharacterV2Manager.js", {
            getById: () => ({
                id: "character",
                discord_user_id: "user"
            })
        });
        stubModule("src/v2/managers/PhoneV2Manager.js", {
            getCallById: () => ({
                id: 40,
                caller_phone_id: 10,
                receiver_phone_id: 20,
                status: "accepted"
            }),
            getPhoneById: id => ({ id }),
            getContinuityByPhone: id => ({
                id: `continuity-${id}`,
                character_id: "character"
            }),
            endCall: id => {
                order.push("ended");
                return { id, status: "ended" };
            }
        });
        stubModule("src/v2/managers/PhoneCallSessionManager.js", {
            get: id => sessions.get(Number(id)),
            remove: id => sessions.delete(Number(id))
        });
        stubModule("src/v2/services/phone/PhoneCallService.js", {
            finalizeCall: async () => {
                order.push("finalize");
                const error = new Error(
                    "Le salon ou thread utilisé pour cet appel n’existe plus."
                );
                error.phoneChannelDiagnostic = {
                    status: "unknown_channel",
                    discordCode: 10003
                };
                throw error;
            }
        });
        stubModule("src/v2/managers/PhoneCallUIManager.js", {
            refresh: async id => {
                order.push("refresh");
                sessions.delete(Number(id));
            }
        });
        stubModule("src/v2/core/services/TechnicalLogger.js", {
            create: () => ({ error: () => null })
        });

        const pagePath = require.resolve(
            "../src/v2/pages/character/PhoneCallActionPage"
        );
        delete require.cache[pagePath];
        const page = require(pagePath);

        const result = await page.end({
            client: {},
            guildId: "guild",
            user: { id: "user" },
            deferUpdate: async () => null
        }, 40, "character");

        assert.equal(result.status, "ended");
        assert.deepEqual(order, [
            "ended",
            "finalize",
            "refresh"
        ]);
        assert.equal(sessions.has(40), false);
    }
);

function phoneCallFixture(options = {}) {
    const created = [];
    const sendAttempts = [];
    const target = options.channel || discordChannel();
    const channelCalls = target.calls;

    stubModule("src/webhooks/webhookManager.js", {
        sendWithWebhook: async (channel, payload) => {
            sendAttempts.push({ channel, payload });
            if (options.networkError) {
                throw options.networkError;
            }
            return {
                webhook: { id: "webhook" },
                webhookMessage: { id: "message" }
            };
        }
    });
    stubModule("src/v2/managers/PhoneCallSessionManager.js", {
        get: () => ({ channelId: "target", guildId: "guild" }),
        register: () => null
    });
    stubModule("src/v2/core/services/TechnicalLogger.js", {
        create: () => ({ warn: () => null })
    });

    for (const modulePath of [
        "../src/v2/services/phone/PhoneCallService",
        "../src/v2/core/services/DiscordChannelDiagnosticService",
        "../src/v2/core/services/DiscordThreadAccessService"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }

    const service = require(
        "../src/v2/services/phone/PhoneCallService"
    );
    const fetch = async () => {
        if (options.fetchError) {
            const error = new Error("Discord failure");
            error.code = options.fetchError;
            throw error;
        }
        return target;
    };

    return {
        service,
        created,
        sendAttempts,
        channelCalls,
        speech: {
            client: {
                channels: { fetch }
            },
            channelId: "target",
            guildId: "guild",
            callId: 40,
            character: { id: "speaker", name: "Vega" },
            otherCharacter: { id: "listener" },
            contactName: "Alba",
            content: "Allô",
            onChannelReady: () => created.push("message")
        }
    };
}

function discordChannel(options = {}) {
    const calls = [];
    const isThread = options.isThread !== false;
    const channel = {
        id: "target",
        type: isThread
            ? ChannelType.PublicThread
            : ChannelType.GuildText,
        guildId: "guild",
        parent: isThread
            ? { id: "parent", type: ChannelType.GuildText }
            : null,
        parentId: isThread ? "parent" : null,
        archived: Boolean(options.archived),
        locked: Boolean(options.locked),
        calls,
        isThread: () => isThread,
        isTextBased: () => true,
        setArchived: async value => {
            calls.push(["setArchived", value]);
            channel.archived = value;
            return channel;
        }
    };
    return channel;
}
