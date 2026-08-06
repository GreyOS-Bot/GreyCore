const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "une scène conserve son cycle lorsqu'elle change de salon",
    context => {
        const isolated = createIsolatedDatabase({
            initializeSchema: true
        });
        context.after(() => isolated.cleanup());

        isolated.database.prepare(`
            INSERT INTO Guilds (id, name, created_at)
            VALUES ('guild', 'Greyline', '2026-08-06')
        `).run();

        const modules = [
            "../src/v2/repositories/SceneAssistantRepository",
            "../src/v2/managers/SceneAssistantV2Manager"
        ];
        for (const modulePath of modules) {
            delete require.cache[require.resolve(modulePath)];
        }

        const manager = require(
            "../src/v2/managers/SceneAssistantV2Manager"
        );
        const scene = manager.createScene({
            guildId: "guild",
            title: "Soirée au Steel",
            channelId: "steel",
            createdBy: "player",
            startedAt: "2026-08-06T18:00:00.000Z"
        });

        manager.recordSceneMessage(
            scene.id,
            "2026-08-06T18:01:00.000Z"
        );
        manager.moveScene({
            sceneId: scene.id,
            guildId: "guild",
            sourceChannelId: "steel",
            destinationChannelId: "catchup-steel",
            transitionMessageId: "message-42",
            createdBy: "player",
            movedAt: "2026-08-07T18:00:00.000Z"
        });
        manager.recordSceneMessage(
            scene.id,
            "2026-08-07T18:01:00.000Z"
        );

        assert.equal(
            manager.getActiveSceneByChannel(
                "guild",
                "steel"
            ),
            null
        );
        assert.equal(
            manager.getActiveSceneByChannel(
                "guild",
                "catchup-steel"
            ).id,
            scene.id
        );
        assert.equal(
            manager.getScene(scene.id).rp_message_count,
            2
        );
    }
);
