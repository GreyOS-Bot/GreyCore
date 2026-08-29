const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test(
    "un message webhook tiers est ignoré avant tout traitement Proxy GreyCore",
    async () => {
        const calls = {
            upload: 0,
            proxy: 0,
            entity: 0,
            scene: 0
        };

        stubModule(
            "src/events/handlers/messageCreate/PendingUploadRouter.js",
            async () => {
                calls.upload += 1;
                return false;
            }
        );
        stubModule(
            "src/events/handlers/messageCreate/ProxyMessageHandler.js",
            async () => {
                calls.proxy += 1;
                return true;
            }
        );
        stubModule(
            "src/v2/services/entities/NarrativeEntityService.js",
            {
                processMessage: async () => {
                    calls.entity += 1;
                    return true;
                }
            }
        );
        stubModule(
            "src/v2/services/scenes/SceneAssistantService.js",
            {
                processMessage: async () => {
                    calls.scene += 1;
                    return null;
                }
            }
        );
        stubModule(
            "src/v2/managers/SceneAssistantV2Manager.js",
            {}
        );
        stubModule(
            "src/v2/managers/GuildSettingsV2Manager.js",
            {
                isMaintenanceEnabled: () => false
            }
        );
        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create: () => ({
                    warn: () => {},
                    error: () => {}
                })
            }
        );
        stubModule(
            "src/v2/core/services/DiscordThreadAccessService.js",
            {}
        );

        const routerPath = require.resolve(
            "../src/events/handlers/messageCreate"
        );
        delete require.cache[routerPath];
        const router = require(routerPath);

        const result = await router({
            id: "pluralkit-webhook-message",
            webhookId: "third-party-webhook",
            author: {
                id: "external-bot",
                bot: true
            },
            content: "Reya: message proxifié ailleurs"
        });

        assert.equal(result, false);
        assert.deepEqual(calls, {
            upload: 0,
            proxy: 0,
            entity: 0,
            scene: 0
        });
    }
);
