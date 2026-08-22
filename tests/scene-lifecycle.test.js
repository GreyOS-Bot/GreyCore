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

test(
    "une scène démarre une seule fois puis exige deux participants pour se clôturer",
    context => {
        const isolated = createIsolatedDatabase({
            initializeSchema: true
        });
        context.after(() => isolated.cleanup());

        isolated.database.prepare(`
            INSERT INTO Guilds (id, name, created_at)
            VALUES ('guild', 'Greyline', '2026-08-06')
        `).run();
        isolated.database.prepare(`
            INSERT INTO UsersV2 (
                discord_user_id, created_at, updated_at
            ) VALUES
                ('player-1', '2026-08-06', '2026-08-06'),
                ('player-2', '2026-08-06', '2026-08-06')
        `).run();
        isolated.database.prepare(`
            INSERT INTO CharactersV2 (
                id, owner_user_id, proxy_name, character_type,
                created_at, updated_at
            ) VALUES
                ('character-1', 1, 'Reya', 'personnage_joue', '2026-08-06', '2026-08-06'),
                ('character-2', 2, 'Alba', 'personnage_joue', '2026-08-06', '2026-08-06')
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

        manager.configure({
            guildId: "guild",
            durationDays: 8,
            recommendedMessageCount: 100,
            inactivityHours: 48
        });
        assert.equal(manager.proposeSceneStart({
            guildId: "guild",
            channelId: "steel",
            messageId: "opening-message",
            characterId: "character-1"
        }), true);
        assert.equal(manager.proposeSceneStart({
            guildId: "guild",
            channelId: "steel",
            messageId: "another-message",
            characterId: "character-1"
        }), false);

        const scene = manager.createScene({
            guildId: "guild",
            channelId: "steel",
            title: "Soirée au Steel",
            startedAt: "2026-08-01T10:00:00.000Z"
        });
        manager.resolveStartProposal("guild", "steel");
        manager.addParticipant(scene.id, "character-1");
        manager.addParticipant(scene.id, "character-2");
        manager.recordSceneMessage(
            scene.id,
            "2026-08-01T10:00:00.000Z"
        );

        assert.equal(
            manager.getInactiveScenes(
                new Date("2026-08-03T10:00:01.000Z")
            ).length,
            1
        );
        manager.saveClosurePrompt({
            sceneId: scene.id,
            guildId: "guild",
            channelId: "steel",
            messageId: "closure-message"
        });
        assert.equal(manager.addClosureVote(scene.id, "player-1"), 1);
        assert.equal(manager.addClosureVote(scene.id, "player-1"), 1);
        assert.equal(manager.addClosureVote(scene.id, "player-2"), 2);
        manager.closeScene(scene.id);

        assert.equal(manager.getScene(scene.id).status, "closed");
        assert.equal(
            manager.getActiveSceneByChannel("guild", "steel"),
            null
        );
        assert.equal(manager.proposeSceneStart({
            guildId: "guild",
            channelId: "steel",
            messageId: "next-opening-message",
            characterId: "character-1"
        }), true);
    }
);

test("un joueur ayant réellement proxifié dans la scène peut confirmer même si son participant manque", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`INSERT INTO Guilds (id, name, created_at) VALUES ('guild-proof', 'Greyline', '2026-08-06')`).run();
    isolated.database.prepare(`
        INSERT INTO UsersV2 (discord_user_id, created_at, updated_at)
        VALUES ('player-proof', '2026-08-06', '2026-08-06')
    `).run();
    isolated.database.prepare(`
        INSERT INTO CharactersV2 (id, owner_user_id, proxy_name, character_type, created_at, updated_at)
        VALUES ('character-proof', 1, 'London', 'personnage_joue', '2026-08-06', '2026-08-06')
    `).run();
    for (const modulePath of [
        "../src/v2/repositories/SceneAssistantRepository",
        "../src/v2/managers/SceneAssistantV2Manager"
    ]) delete require.cache[require.resolve(modulePath)];
    const manager = require("../src/v2/managers/SceneAssistantV2Manager");
    const scene = manager.createScene({
        guildId: "guild-proof", channelId: "home", title: "Chez London",
        startedAt: "2026-08-20T10:00:00.000Z"
    });
    isolated.database.prepare(`
        INSERT INTO ProxyMessages (
            discord_message_id, webhook_message_id, webhook_id, channel_id,
            guild_id, author_id, character_id, character_version, created_at
        ) VALUES ('original', 'webhook-message', 'webhook', 'home',
            'guild-proof', 'player-proof', 'character-proof', 'v2', '2026-08-20T11:00:00.000Z')
    `).run();
    assert.equal(manager.isSceneParticipantUser(scene.id, "player-proof"), true);
});
