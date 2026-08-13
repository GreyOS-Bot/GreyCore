const test = require("node:test");
const assert = require("node:assert/strict");

const messageCreateRouter = require(
    "../src/events/handlers/messageCreate"
);
const sceneAssistantService = require(
    "../src/v2/services/scenes/SceneAssistantService"
);
const sceneAssistantManager = require(
    "../src/v2/managers/SceneAssistantV2Manager"
);

function replaceMethod(context, target, name, implementation) {
    const original = target[name];
    target[name] = implementation;
    context.after(() => {
        target[name] = original;
    });
}

test(
    "une proposition de début supprimée est recréée sur le nouveau message",
    async context => {
        let proposalCalls = 0;
        let resolvedStatus = null;
        let reaction = null;

        replaceMethod(
            context,
            sceneAssistantService,
            "proposeStartFromMessage",
            () => {
                proposalCalls += 1;
                return proposalCalls === 2;
            }
        );
        replaceMethod(
            context,
            sceneAssistantManager,
            "getPendingStartProposal",
            () => ({ message_id: "deleted-message" })
        );
        replaceMethod(
            context,
            sceneAssistantManager,
            "resolveStartProposal",
            (_guildId, _channelId, status) => {
                resolvedStatus = status;
            }
        );

        const targetMessage = {
            id: "new-message",
            react: async emoji => {
                reaction = emoji;
            }
        };
        const message = {
            guildId: "guild",
            channelId: "channel",
            channel: {
                messages: {
                    fetch: async () => null
                }
            },
            greycoreProxyWebhookMessage: targetMessage
        };

        const offered = await messageCreateRouter.offerSceneStart(
            message,
            { characterId: "character" }
        );

        assert.equal(offered, true);
        assert.equal(proposalCalls, 2);
        assert.equal(resolvedStatus, "obsolete");
        assert.equal(reaction, "🎬");
    }
);

test(
    "une ancienne proposition sans réaction ne bloque plus le lieu",
    async context => {
        let proposalCalls = 0;
        let resolvedStatus = null;

        replaceMethod(
            context,
            sceneAssistantService,
            "proposeStartFromMessage",
            () => {
                proposalCalls += 1;
                return proposalCalls === 2;
            }
        );
        replaceMethod(
            context,
            sceneAssistantManager,
            "getPendingStartProposal",
            () => ({ message_id: "message-without-reaction" })
        );
        replaceMethod(
            context,
            sceneAssistantManager,
            "resolveStartProposal",
            (_guildId, _channelId, status) => {
                resolvedStatus = status;
            }
        );

        const message = {
            guildId: "guild",
            channelId: "channel",
            channel: {
                messages: {
                    fetch: async () => ({
                        reactions: {
                            cache: {
                                find: () => undefined
                            }
                        }
                    })
                }
            },
            react: async () => undefined
        };

        const offered = await messageCreateRouter.offerSceneStart(
            message,
            { characterId: "character" }
        );

        assert.equal(offered, true);
        assert.equal(proposalCalls, 2);
        assert.equal(resolvedStatus, "obsolete");
    }
);

test(
    "un échec de réaction libère le lieu pour une proposition suivante",
    async context => {
        let resolvedStatus = null;

        replaceMethod(
            context,
            sceneAssistantService,
            "proposeStartFromMessage",
            () => true
        );
        replaceMethod(
            context,
            sceneAssistantManager,
            "resolveStartProposal",
            (_guildId, _channelId, status) => {
                resolvedStatus = status;
            }
        );

        const message = {
            guildId: "guild",
            channelId: "channel",
            channel: { messages: { fetch: async () => null } },
            react: async () => {
                throw new Error("Missing permissions");
            }
        };

        const offered = await messageCreateRouter.offerSceneStart(
            message,
            { characterId: "character" }
        );

        assert.equal(offered, false);
        assert.equal(resolvedStatus, "reaction_failed");
    }
);
