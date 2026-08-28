const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

function clear(modulePath) {
    delete require.cache[require.resolve(modulePath)];
}

test(
    "les Entités délèguent leurs nouveaux messages au contrat webhook central",
    async () => {
        const calls = [];
        const entity = {
            id: 7,
            name: "Le Destin",
            avatar_url: "https://example.com/avatar.png",
            embed_color: "#123456",
            is_enabled: 1,
            messages: [{ content: "Bienvenue", is_enabled: 1 }]
        };
        stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
            chooseForTrigger: () => ({
                entity,
                message: entity.messages[0]
            }),
            getById: () => entity
        });
        stubModule("src/webhooks/webhookManager.js", {
            sendWithWebhook: async (channel, payload) => {
                calls.push({ channel, payload });
                return {
                    webhook: { id: "webhook" },
                    webhookMessage: { id: `message-${calls.length}` }
                };
            }
        });
        clear("../src/v2/services/entities/NarrativeEntityService");
        const service = require(
            "../src/v2/services/entities/NarrativeEntityService"
        );
        const channel = { id: "forum", guildId: "guild" };

        await service.send({
            channel,
            triggerKey: "welcome",
            content: "Invocation"
        });
        await service.sendEntity({
            channel,
            entityId: 7,
            content: "Diffusion",
            threadName: "Nouveau post"
        });

        assert.equal(calls.length, 2);
        assert.equal(calls[0].payload.embeds[0].data.description, "Invocation");
        assert.equal(calls[1].payload.threadName, "Nouveau post");
        assert.equal(calls[1].payload.username, "Le Destin");
    }
);

test(
    "GreyFate marque l'effet externe seulement au début d'un véritable send",
    async () => {
        let mode = "before-send-failure";
        let sendAttempts = 0;
        stubModule("src/v2/repositories/GreyFateRepository.js", {});
        stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
            getByGuild: () => [{
                name: "The Weaver of Fate",
                is_enabled: 1,
                avatar_url: null,
                embed_color: "#000000"
            }]
        });
        stubModule("src/v2/core/services/DiscordThreadAccessService.js", {
            ensureWritable: async channel => ({
                ready: true,
                channel
            }),
            errorFor: () => new Error("thread inaccessible")
        });
        stubModule("src/webhooks/webhookManager.js", {
            sendWithWebhook: async (
                channel,
                payload,
                options
            ) => {
                if (mode === "before-send-failure") {
                    const error = new Error("permissions");
                    error.webhookDiagnostic = {
                        kind: "MISSING_PERMISSIONS"
                    };
                    throw error;
                }
                options.onBeforeSendAttempt();
                sendAttempts += 1;
                return {
                    webhook: { id: "webhook" },
                    webhookMessage: { id: "message" },
                    payload
                };
            }
        });
        stubModule("src/v2/core/services/TechnicalLogger.js", {
            create: () => ({
                info: () => {},
                warn: () => {},
                error: () => {}
            })
        });
        clear("../src/v2/services/greyfate/GreyFateIntegrationService");
        const service = require(
            "../src/v2/services/greyfate/GreyFateIntegrationService"
        );
        const channel = { id: "thread", guildId: "guild" };
        const beforeFailure = { externalEffectAttempted: false };

        await assert.rejects(
            service.sendAsWeaver(
                channel,
                "Bienvenue",
                [],
                beforeFailure
            ),
            /permissions/
        );
        assert.equal(beforeFailure.externalEffectAttempted, false);

        mode = "send";
        const attempted = { externalEffectAttempted: false };
        const message = await service.sendAsWeaver(
            channel,
            "Bienvenue",
            [],
            attempted
        );
        assert.equal(message.id, "message");
        assert.equal(attempted.externalEffectAttempted, true);
        assert.equal(sendAttempts, 1);
    }
);

test(
    "GreyFate écrit chaque marqueur une fois après récupération 10015",
    async () => {
        const duos = new Map();
        const markers = [];
        const payloads = [];
        const repository = {
            initializeSchema: () => {},
            upsertEvent: () => {},
            upsertDuo: (payload, duo) => {
                duos.set(duo.duoId, {
                    duo_id: duo.duoId,
                    thread_id: duo.threadId,
                    welcome_sent_at: null,
                    closure_prompt_sent_at: null,
                    closed_at: null
                });
            },
            getDuo: id => duos.get(id),
            markWelcome: id => {
                markers.push(["welcome", id]);
                duos.get(id).welcome_sent_at = "now";
            },
            markClosurePrompt: id => {
                markers.push(["closure", id]);
                duos.get(id).closure_prompt_sent_at = "now";
            },
            markError: () => {
                throw new Error("aucune erreur attendue");
            }
        };
        stubModule(
            "src/v2/repositories/GreyFateRepository.js",
            repository
        );
        stubModule("src/v2/managers/NarrativeEntityV2Manager.js", {
            getByGuild: () => [{
                name: "The Weaver of Fate",
                is_enabled: 1,
                avatar_url: null,
                embed_color: "#000000"
            }]
        });
        stubModule("src/v2/core/services/DiscordThreadAccessService.js", {
            ensureWritable: async channel => ({ ready: true, channel }),
            errorFor: () => new Error("thread inaccessible")
        });
        clear("../src/webhooks/webhookManager");
        const centralManager = require(
            "../src/webhooks/webhookManager"
        );
        stubModule(
            "src/webhooks/webhookManager.js",
            centralManager
        );
        stubModule("src/v2/core/services/TechnicalLogger.js", {
            create: () => ({
                info: () => {},
                warn: () => {},
                error: () => {}
            })
        });

        function retryingThread(id) {
            let resolution = 0;
            const first = {
                id: `${id}-old`,
                name: "Greycore Proxy",
                owner: { id: "greycore" },
                send: async payload => {
                    payloads.push([id, "old", payload]);
                    const error = new Error("Unknown Webhook");
                    error.code = 10015;
                    throw error;
                }
            };
            const second = {
                id: `${id}-new`,
                name: "Greycore Proxy",
                owner: { id: "greycore" },
                send: async payload => {
                    payloads.push([id, "new", payload]);
                    return { id: `${id}-message` };
                }
            };
            const parent = {
                id: `${id}-parent`,
                client: { user: { id: "greycore" } },
                isThread: () => false,
                fetchWebhooks: async () => {
                    resolution += 1;
                    const hooks = resolution === 1
                        ? [first]
                        : [first, second];
                    return new Map(hooks.map(hook => [hook.id, hook]));
                }
            };
            return {
                id,
                guildId: "guild",
                parent,
                isThread: () => true
            };
        }

        const welcomeThread = retryingThread("welcome-thread");
        const closureThread = retryingThread("closure-thread");
        const channels = new Map([
            [welcomeThread.id, welcomeThread],
            [closureThread.id, closureThread]
        ]);
        clear("../src/v2/services/greyfate/GreyFateIntegrationService");
        const service = require(
            "../src/v2/services/greyfate/GreyFateIntegrationService"
        );
        service.client = {
            channels: {
                fetch: async id => channels.get(id)
            }
        };
        const executionState = { externalEffectAttempted: false };

        await service.eventStarted({
            eventId: "event",
            guildId: "guild",
            duos: [{
                duoId: "duo",
                threadId: welcomeThread.id,
                maleCharacter: "A",
                femaleCharacter: "B"
            }]
        }, executionState);
        duos.set("duo-closure", {
            duo_id: "duo-closure",
            thread_id: closureThread.id,
            welcome_sent_at: "now",
            closure_prompt_sent_at: null,
            closed_at: null
        });
        await service.closureDue(
            { duoId: "duo-closure" },
            executionState
        );

        assert.deepEqual(markers, [
            ["welcome", "duo"],
            ["closure", "duo-closure"]
        ]);
        assert.equal(payloads.length, 4);
        assert.ok(payloads.every(
            ([id, , payload]) => payload.threadId === id
        ));
        assert.equal(executionState.externalEffectAttempted, true);
    }
);
