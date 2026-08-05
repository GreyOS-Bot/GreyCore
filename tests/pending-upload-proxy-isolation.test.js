const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "une attente d'image ne bloque pas les proxies dans un autre salon",
    async () => {
        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                cleanupExpired: () => {},
                get: () => ({
                    type: "character_avatar_upload",
                    guildId: "guild",
                    channelId: "avatar-channel"
                })
            }
        );

        const routerPath = require.resolve(
            "../src/events/handlers/messageCreate/PendingUploadRouter"
        );
        delete require.cache[routerPath];
        const router = require(
            "../src/events/handlers/messageCreate/PendingUploadRouter"
        );

        const handled = await router({
            author: { id: "user" },
            guild: { id: "guild" },
            channel: { id: "roleplay-channel" }
        });

        assert.equal(handled, false);
    }
);

test(
    "une attente d'image reste limitée à son salon d'envoi",
    async () => {
        let uploadCount = 0;

        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                cleanupExpired: () => {},
                get: () => ({
                    type: "character_avatar_upload",
                    guildId: "guild",
                    channelId: "avatar-channel"
                })
            }
        );
        stubModule(
            "src/events/handlers/messageCreate/uploads/CharacterAvatarUploadHandler.js",
            async () => {
                uploadCount += 1;
            }
        );

        const routerPath = require.resolve(
            "../src/events/handlers/messageCreate/PendingUploadRouter"
        );
        delete require.cache[routerPath];
        const router = require(
            "../src/events/handlers/messageCreate/PendingUploadRouter"
        );

        const handled = await router({
            author: { id: "user" },
            guild: { id: "guild" },
            channel: { id: "avatar-channel" }
        });

        assert.equal(handled, true);
        assert.equal(uploadCount, 1);
    }
);
