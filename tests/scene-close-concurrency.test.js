const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");
const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la clôture atomique ne finalise qu’une fois la scène, son prompt et ses liens",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });
        context.after(
            () => isolated.cleanup()
        );

        isolated.database.prepare(`
            INSERT INTO Guilds (
                id,
                name,
                created_at
            )
            VALUES ('guild', 'Greyline', '2026-08-27')
        `).run();
        isolated.database.prepare(`
            INSERT INTO UsersV2 (
                discord_user_id,
                created_at,
                updated_at
            )
            VALUES (
                'player',
                '2026-08-27',
                '2026-08-27'
            )
        `).run();
        isolated.database.prepare(`
            INSERT INTO CharactersV2 (
                id,
                owner_user_id,
                proxy_name,
                character_type,
                created_at,
                updated_at
            )
            VALUES (
                'character',
                1,
                'Reya',
                'personnage_joue',
                '2026-08-27',
                '2026-08-27'
            )
        `).run();

        for (const modulePath of [
            "../src/v2/repositories/SceneAssistantRepository",
            "../src/v2/managers/SceneAssistantV2Manager"
        ]) {
            delete require.cache[
                require.resolve(modulePath)
            ];
        }

        const manager =
            require(
                "../src/v2/managers/SceneAssistantV2Manager"
            );
        const scene =
            manager.createScene({
                guildId: "guild",
                channelId: "scene-channel",
                title: "Scène concurrente",
                createdBy: "player"
            });

        manager.saveClosurePrompt({
            sceneId: scene.id,
            guildId: "guild",
            channelId: "scene-channel",
            messageId: "closure-prompt"
        });
        manager.addParticipant(
            scene.id,
            "character"
        );

        const first =
            manager.closeScene(
                scene.id,
                {
                    requirePendingPrompt:
                        true
                }
            );
        const firstEndedAt =
            first.ended_at;
        const second =
            manager.closeScene(
                scene.id,
                {
                    requirePendingPrompt:
                        true
                }
            );

        assert.equal(first.status, "closed");
        assert.equal(second, null);
        assert.equal(
            manager.getScene(scene.id)
                .ended_at,
            firstEndedAt
        );
        assert.equal(
            isolated.database.prepare(`
                SELECT status
                FROM SceneClosurePromptsV2
                WHERE scene_id = ?
            `).get(scene.id).status,
            "closed"
        );
        assert.equal(
            isolated.database.prepare(`
                SELECT COUNT(*) AS total
                FROM SceneChannelsV2
                WHERE scene_id = ?
                AND unlinked_at IS NOT NULL
            `).get(scene.id).total,
            1
        );
        assert.equal(
            isolated.database.prepare(`
                SELECT COUNT(*) AS total
                FROM SceneParticipantsV2
                WHERE scene_id = ?
                AND left_at IS NOT NULL
            `).get(scene.id).total,
            1
        );
    }
);

test(
    "deux derniers votes concurrents ne produisent qu’une annonce de clôture",
    async () => {
        const scene = {
            id: "scene",
            guild_id: "guild",
            title: "Scène votée"
        };
        let closeAttempts = 0;
        let narrativeCount = 0;
        let updates = 0;
        let errors = 0;

        stubModule(
            "src/v2/managers/SceneAssistantV2Manager.js",
            {
                getScene: () => scene,
                getClosurePromptByMessage:
                    () => ({
                        scene_id: "scene",
                        status: "pending"
                    }),
                isSceneParticipantUser:
                    () => true,
                addClosureVote:
                    () => 2,
                closeScene: () => {
                    closeAttempts += 1;
                    return closeAttempts === 1
                        ? {
                            ...scene,
                            status: "closed"
                        }
                        : null;
                }
            }
        );
        stubModule(
            "src/v2/services/scenes/SceneAssistantService.js",
            {}
        );
        stubModule(
            "src/v2/services/entities/NarrativeEntityService.js",
            {
                send: async () => {
                    narrativeCount += 1;
                    return {};
                }
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async () => {
                    errors += 1;
                }
            }
        );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/scenes/SceneInteractionHandler"
            );
        delete require.cache[handlerPath];
        const handler =
            require(handlerPath);

        const interaction = () => ({
            guildId: "guild",
            user: {
                id: "player"
            },
            message: {
                id: "closure-message"
            },
            channel: {},
            update: async () => {
                updates += 1;
            }
        });

        await Promise.all([
            handler.voteClose(
                interaction(),
                "scene"
            ),
            handler.voteClose(
                interaction(),
                "scene"
            )
        ]);

        assert.equal(closeAttempts, 2);
        assert.equal(narrativeCount, 1);
        assert.equal(updates, 1);
        assert.equal(errors, 1);
    }
);

test(
    "clôture directe et clôture votée concurrentes partagent le même claim métier",
    async () => {
        const scene = {
            id: "scene",
            guild_id: "guild",
            title: "Scène partagée",
            created_by: "player"
        };
        let closeAttempts = 0;
        let narrativeCount = 0;
        let successes = 0;
        let errors = 0;

        stubModule(
            "src/v2/managers/SceneAssistantV2Manager.js",
            {
                getScene: () => scene,
                getClosurePromptByMessage:
                    () => ({
                        scene_id: "scene",
                        status: "pending"
                    }),
                isSceneParticipantUser:
                    () => true,
                addClosureVote:
                    () => 2,
                closeScene: () => {
                    closeAttempts += 1;
                    return closeAttempts === 1
                        ? {
                            ...scene,
                            status: "closed"
                        }
                        : null;
                }
            }
        );
        stubModule(
            "src/v2/services/scenes/SceneAssistantService.js",
            {}
        );
        stubModule(
            "src/v2/services/entities/NarrativeEntityService.js",
            {
                send: async () => {
                    narrativeCount += 1;
                    return {};
                }
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async () => {
                    errors += 1;
                }
            }
        );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/scenes/SceneInteractionHandler"
            );
        delete require.cache[handlerPath];
        const handler =
            require(handlerPath);
        const interaction = () => ({
            guildId: "guild",
            user: {
                id: "player"
            },
            message: {
                id: "closure-message"
            },
            channel: {},
            update: async () => {
                successes += 1;
            }
        });

        await Promise.all([
            handler.closeNow(
                interaction(),
                "scene"
            ),
            handler.voteClose(
                interaction(),
                "scene"
            )
        ]);

        assert.equal(closeAttempts, 2);
        assert.equal(narrativeCount, 1);
        assert.equal(successes, 1);
        assert.equal(errors, 1);
    }
);
