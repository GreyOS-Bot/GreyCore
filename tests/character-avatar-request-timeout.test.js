const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la demande d’avatar confirme le bouton avant de préparer l’envoi",
    async () => {
        const order = [];

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById: () => {
                    order.push("character-loaded");

                    return {
                        id: "character",
                        discord_user_id: "owner"
                    };
                }
            }
        );
        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getById: () => {
                    order.push("installation-loaded");

                    return {
                        id: 546,
                        character_id: "character",
                        continuity_id: "continuity",
                        guild_id: "guild"
                    };
                }
            }
        );
        stubModule(
            "src/v2/core/policies/CharacterManagementPolicy.js",
            {
                isOwner: () => true
            }
        );
        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                create: () => {
                    order.push("pending-created");
                }
            }
        );
        stubModule(
            "src/v2/core/services/FastInteractionAcknowledgementService.js",
            {
                deferComponentUpdate:
                    async interaction => {
                        order.push("acknowledged");
                        interaction.deferred = true;
                    }
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async () => null,
                replyPrivate: async () => {
                    order.push("instructions-sent");
                }
            }
        );

        const routerPath = require.resolve(
            "../src/v2/router/buttons/CharacterRouter"
        );
        delete require.cache[routerPath];
        const router = require(
            "../src/v2/router/buttons/CharacterRouter"
        );

        const handled = await router({
            customId:
                "v2_character_avatar_request:character:546",
            guildId: "guild",
            channelId: "channel",
            user: {
                id: "owner"
            },
            isButton: () => true
        });

        assert.equal(handled, true);
        assert.deepEqual(
            order,
            [
                "acknowledged",
                "character-loaded",
                "installation-loaded",
                "pending-created",
                "instructions-sent"
            ]
        );
    }
);
