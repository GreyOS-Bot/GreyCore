const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "l'assistant suit seulement les zones RP et recommande de conclure sans les bloquer",
    async context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        context.after(
            () => isolated.cleanup()
        );

        seedGuild(isolated.database);

        const {
            manager,
            service
        } = loadSceneAssistant();

        manager.configure({
            guildId: "guild",
            durationDays: 8,
            recommendedMessageCount: 3
        });
        manager.addScope({
            guildId: "guild",
            channelId: "rp-category",
            createdBy: "staff"
        });

        const channel = createThreadInCategory();

        const openingMessage = createMessage(channel);
        openingMessage.greycoreSceneCharacterId = "character";
        const withoutScene = await service.processMessage(
            openingMessage
        );

        assert.equal(withoutScene.kind, "no_active_scene");
        assert.equal(withoutScene.shouldOfferStart, true);

        manager.createScene({
            guildId: "guild",
            channelId: channel.id,
            title: "Scène de test",
            startedAt: "2026-07-30T12:00:00.000Z"
        });

        assert.equal(
            await service.processMessage({
                guildId: "guild",
                channel: {
                    id: "outside-rp"
                },
                author: {
                    bot: false
                },
                createdTimestamp:
                    Date.parse(
                        "2026-07-30T12:00:00.000Z"
                    )
            }),
            null,
            "un message hors zone RP ne doit pas etre suivi"
        );

        const first = await service.processMessage(
            createMessage(channel, "Rattrapage ?")
        );
        const second = await service.processMessage(
            createMessage(channel)
        );
        const third = await service.processMessage(
            createMessage(channel)
        );

        assert.equal(
            first.justReachedThreshold,
            false
        );
        assert.equal(first.moveIntentDetected, true);
        assert.equal(second.moveIntentDetected, false);
        assert.equal(
            second.justReachedThreshold,
            false
        );
        assert.equal(
            third.justReachedThreshold,
            true
        );
        assert.equal(
            third.cycle.status,
            "conclude"
        );
        assert.equal(
            third.cycle.rp_message_count,
            3
        );

        const fourth = await service.processMessage(
            createMessage(channel)
        );

        assert.equal(
            fourth.justReachedThreshold,
            false,
            "l'alerte ne doit pas etre envoyee pour chaque message suivant"
        );
        assert.equal(
            fourth.cycle.rp_message_count,
            4
        );

        const status = service.getStatus({
            guildId: "guild",
            channel,
            now: new Date(
                "2026-07-30T12:00:00.000Z"
            )
        });

        assert.equal(status.kind, "tracked");
        assert.equal(status.cycle.status, "conclude");
        assert.equal(status.evaluation.elapsedDays, 1);

        const restarted = service.startNewCycle({
            guildId: "guild",
            channel
        });

        assert.equal(restarted.status, "active");
        assert.equal(restarted.rp_message_count, 0);
    }
);

test(
    "la duree seule est evaluee depuis le premier message du cycle",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        context.after(
            () => isolated.cleanup()
        );

        seedGuild(isolated.database);

        const {
            manager,
            service
        } = loadSceneAssistant();

        manager.configure({
            guildId: "guild",
            durationDays: 8,
            recommendedMessageCount: null
        });

        const evaluation = service.evaluateCycle(
            {
                started_at: "2026-07-01T10:00:00.000Z",
                rp_message_count: 1
            },
            manager.getConfiguration("guild"),
            new Date("2026-07-08T10:00:00.000Z")
        );

        assert.equal(evaluation.elapsedDays, 8);
        assert.equal(evaluation.durationReached, true);
        assert.equal(evaluation.messageReached, false);
        assert.equal(evaluation.shouldConclude, true);
    }
);

function loadSceneAssistant() {
    const modules = [
        "../src/v2/repositories/SceneAssistantRepository",
        "../src/v2/managers/SceneAssistantV2Manager",
        "../src/v2/services/scenes/SceneAssistantService"
    ];

    for (const modulePath of modules) {
        delete require.cache[
            require.resolve(modulePath)
        ];
    }

    return {
        manager: require(
            "../src/v2/managers/SceneAssistantV2Manager"
        ),
        service: require(
            "../src/v2/services/scenes/SceneAssistantService"
        )
    };
}

function seedGuild(database) {
    database.prepare(`
        INSERT INTO Guilds (
            id,
            name,
            created_at
        )
        VALUES ('guild', 'GreyOS', '2026-07-30T00:00:00.000Z')
    `).run();
}

function createThreadInCategory() {
    const category = {
        id: "rp-category"
    };
    const forum = {
        id: "rp-forum",
        parentId: "rp-category",
        parent: category
    };

    return {
        id: "rp-thread",
        parentId: "rp-forum",
        parent: forum
    };
}

function createMessage(channel, content = "Une réponse RP") {
    return {
        guildId: "guild",
        channelId: channel.id,
        channel,
        author: {
            bot: false
        },
        content,
        createdTimestamp:
            Date.parse(
                "2026-07-30T12:00:00.000Z"
            )
    };
}
