const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ChannelType
} = require("discord.js");

const {
    stubModule
} = require("./helpers/moduleStub");

const {
    withThreadId
} = require(
    "../src/v2/core/services/ProxyThreadContext"
);

test(
    "le webhook commun rouvre un thread archivé et refuse tout thread verrouillé",
    async () => {
        clear("../src/webhooks/webhookManager");
        const manager = require(
            "../src/webhooks/webhookManager"
        );
        const sent = [];
        let webhookReads = 0;
        const webhook = {
            id: "webhook",
            owner: { id: "bot" },
            name: "Greycore Proxy",
            send: async payload => sent.push(payload)
        };
        const parent = parentChannel(() => {
            webhookReads += 1;
            return [webhook];
        });
        const archived = threadChannel(
            "archived",
            parent,
            { archived: true }
        );

        const resolved =
            await manager.getOrCreateWebhook(archived);
        await resolved.send(
            withThreadId(archived, { content: "message" })
        );

        assert.deepEqual(archived.calls, [
            ["setArchived", false]
        ]);
        assert.equal(webhookReads, 1);
        assert.equal(sent[0].threadId, "archived");

        const locked = threadChannel(
            "locked",
            parent,
            { archived: true, locked: true }
        );
        await assert.rejects(
            manager.getOrCreateWebhook(locked),
            /verrouillé/
        );
        assert.deepEqual(locked.calls, []);
        assert.equal(webhookReads, 1);
    }
);

test(
    "un Proxy verrouillé libère son claim avant tout webhook",
    async () => {
        let released = 0;
        let webhookReads = 0;
        stubModule("src/services/proxyService.js", {
            parseProxy: () => ({
                character: "Reya",
                content: "Bonjour"
            })
        });
        stubModule("src/services/proxy/ProxyCharacterResolver.js", {
            resolveProxyCharacter: () => ({
                character: {
                    id: "character",
                    name: "Reya",
                    avatar: null
                },
                v2Installation: null
            }),
            resolveCharacterByReference: () => null
        });
        stubModule("src/managers/ProxyMessageManager.js", {
            claim: () => "claim",
            releaseClaim: () => {
                released += 1;
            },
            getByWebhookMessageId: () => null
        });
        stubModule("src/v2/core/policies/ValidationStaffPolicy.js", {
            canManageServerTools: () => false
        });
        stubModule("src/v2/services/moderation/UserPlayBlockService.js", {
            get: () => null
        });
        clear("../src/webhooks/webhookManager");
        clear(
            "../src/events/handlers/messageCreate/ProxyMessageHandler"
        );
        const handler = require(
            "../src/events/handlers/messageCreate/ProxyMessageHandler"
        );
        const parent = parentChannel(() => {
            webhookReads += 1;
            return [];
        });
        const channel = threadChannel(
            "locked",
            parent,
            { archived: true, locked: true }
        );

        await assert.rejects(
            handler({
                id: "source",
                guild: { id: "guild" },
                author: { id: "user" },
                member: { permissions: null },
                client: {},
                channel,
                content: "Reya: Bonjour",
                attachments: new Map()
            }),
            /verrouillé/
        );

        assert.equal(released, 1);
        assert.equal(webhookReads, 0);
        assert.deepEqual(channel.calls, []);
    }
);

test(
    "GreyFate rouvre avant l'effet externe et refuse un verrou sans état incertain",
    async () => {
        const sent = [];
        stubModule("src/v2/repositories/GreyFateRepository.js", {});
        stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
            getByGuild: () => [{
                name: "The Weaver of Fate",
                is_enabled: 1,
                avatar_url: null,
                embed_color: "#000000"
            }]
        });
        stubModule("src/webhooks/webhookManager.js", {
            getOrCreateWebhook: async () => ({
                send: async payload => {
                    sent.push(payload);
                    return { id: "message" };
                }
            })
        });
        stubModule("src/v2/core/services/TechnicalLogger.js", {
            create: () => ({
                info: () => null,
                warn: () => null,
                error: () => null
            })
        });
        clear(
            "../src/v2/services/greyfate/GreyFateIntegrationService"
        );
        const greyFate = require(
            "../src/v2/services/greyfate/GreyFateIntegrationService"
        );
        const parent = parentChannel(() => []);
        const archived = threadChannel(
            "duo",
            parent,
            { archived: true }
        );
        const successfulState = {
            externalEffectAttempted: false
        };

        await greyFate.sendAsWeaver(
            archived,
            "Bienvenue",
            [],
            successfulState
        );
        assert.deepEqual(archived.calls, [
            ["setArchived", false]
        ]);
        assert.equal(sent.length, 1);
        assert.equal(sent[0].threadId, "duo");
        assert.equal(successfulState.externalEffectAttempted, true);

        const locked = threadChannel(
            "locked-duo",
            parent,
            { archived: true, locked: true }
        );
        const rejectedState = {
            externalEffectAttempted: false
        };
        await assert.rejects(
            greyFate.sendAsWeaver(
                locked,
                "Bienvenue",
                [],
                rejectedState
            ),
            /verrouillé/
        );
        assert.equal(sent.length, 1);
        assert.equal(rejectedState.externalEffectAttempted, false);
        assert.deepEqual(locked.calls, []);
    }
);

test(
    "le balayage d'inactivité rouvre chaque thread admissible et ignore le verrouillé",
    async () => {
        const saved = [];
        const warnings = [];
        const parent = parentChannel(() => []);
        const archived = threadChannel(
            "scene-open",
            parent,
            { archived: true }
        );
        const locked = threadChannel(
            "scene-locked",
            parent,
            { archived: true, locked: true }
        );
        stubModule("src/v2/managers/SceneAssistantV2Manager.js", {
            getInactiveScenes: () => [
                {
                    id: "scene-open",
                    channel_id: "scene-open",
                    guild_id: "guild",
                    inactivity_hours: 48
                },
                {
                    id: "scene-locked",
                    channel_id: "scene-locked",
                    guild_id: "guild",
                    inactivity_hours: 48
                }
            ],
            saveClosurePrompt: data => saved.push(data)
        });
        stubModule("src/v2/services/scenes/SceneAssistantService.js", {
            buildClosurePrompt: scene => ({
                content: scene.id
            })
        });
        stubModule("src/v2/core/services/TechnicalLogger.js", {
            create: () => ({
                warn: (...args) => warnings.push(args),
                error: () => null
            })
        });
        clear(
            "../src/v2/services/scenes/SceneInactivityService"
        );
        const inactivity = require(
            "../src/v2/services/scenes/SceneInactivityService"
        );
        inactivity.client = {
            channels: {
                fetch: async id =>
                    id === archived.id
                        ? archived
                        : locked
            }
        };

        const prompted = await inactivity.check();

        assert.deepEqual(prompted, ["scene-open"]);
        assert.deepEqual(archived.calls, [
            ["setArchived", false],
            ["send", "scene-open"]
        ]);
        assert.deepEqual(locked.calls, []);
        assert.equal(saved.length, 1);
        assert.equal(warnings.length, 1);
    }
);

function parentChannel(fetchWebhooks) {
    return {
        id: "parent",
        type: ChannelType.GuildText,
        client: { user: { id: "bot" } },
        fetchWebhooks: async () => fetchWebhooks(),
        createWebhook: async () => {
            throw new Error("création inattendue");
        },
        isThread: () => false,
        isTextBased: () => true
    };
}

function threadChannel(id, parent, options = {}) {
    const calls = [];
    const channel = {
        id,
        guildId: "guild",
        type: ChannelType.PublicThread,
        parent,
        parentId: parent.id,
        archived: Boolean(options.archived),
        locked: Boolean(options.locked),
        calls,
        client: parent.client,
        isThread: () => true,
        isTextBased: () => true,
        setLocked: value => {
            calls.push(["setLocked", value]);
        },
        setArchived: async value => {
            calls.push(["setArchived", value]);
            channel.archived = value;
            return channel;
        },
        send: async payload => {
            calls.push([
                "send",
                payload.content || payload
            ]);
            return { id: `message-${id}` };
        }
    };
    return channel;
}

function clear(modulePath) {
    delete require.cache[require.resolve(modulePath)];
}
