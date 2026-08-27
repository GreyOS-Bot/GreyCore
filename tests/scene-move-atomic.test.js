const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "un déplacement atomique A vers B conserve un seul lien actif",
    context => {
        const fixture =
            createSceneFixture(context);

        const result =
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("B")
                );

        assert.equal(result.moved, true);
        assert.deepEqual(
            fixture.activeLinks(),
            ["B"]
        );
        assert.equal(
            fixture.linkHistory().length,
            2
        );
    }
);

test(
    "deux déplacements A vers B et A vers C ne produisent qu’un gagnant",
    context => {
        const fixture =
            createSceneFixture(context);

        const results = [
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("B")
                ),
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("C")
                )
        ];

        assert.equal(
            results.filter(
                result => result.moved
            ).length,
            1
        );
        assert.equal(
            fixture.activeLinks().length,
            1
        );
        assert.deepEqual(
            fixture.activeLinks(),
            ["B"]
        );
        assert.equal(
            fixture.linkHistory().length,
            2
        );
    }
);

test(
    "deux soumissions A vers B ne créent qu’un déplacement historique",
    context => {
        const fixture =
            createSceneFixture(context);

        const first =
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("B")
                );
        const second =
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("B")
                );

        assert.equal(first.moved, true);
        assert.equal(second.moved, false);
        assert.equal(
            second.reason,
            "stale_source"
        );
        assert.deepEqual(
            fixture.activeLinks(),
            ["B"]
        );
        assert.equal(
            fixture.linkHistory().length,
            2
        );
    }
);

test(
    "une interface A vers C devenue périmée après A vers B ne déplace plus la scène",
    context => {
        const fixture =
            createSceneFixture(context);

        fixture.manager.moveSceneIfCurrent(
            fixture.move("B")
        );
        const stale =
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("C")
                );

        assert.equal(stale.moved, false);
        assert.equal(
            stale.reason,
            "stale_source"
        );
        assert.deepEqual(
            fixture.activeLinks(),
            ["B"]
        );
        assert.equal(
            fixture.linkHistory().length,
            2
        );
    }
);

test(
    "une destination occupée conserve sa scène et restaure la source",
    context => {
        const fixture =
            createSceneFixture(context);
        const other =
            fixture.manager.createScene({
                guildId: "guild",
                channelId: "B",
                title: "Autre scène",
                createdBy: "other"
            });

        const result =
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("B")
                );

        assert.equal(result.moved, false);
        assert.equal(
            result.reason,
            "destination_occupied"
        );
        assert.deepEqual(
            fixture.activeLinks(),
            ["A"]
        );
        assert.equal(
            fixture.database.prepare(`
                SELECT scene_id
                FROM SceneChannelsV2
                WHERE guild_id = 'guild'
                AND channel_id = 'B'
                AND unlinked_at IS NULL
            `).get().scene_id,
            other.id
        );
        assert.equal(
            fixture.linksForScene(
                fixture.scene.id
            ).length,
            1
        );
    }
);

test(
    "A vers A et une scène clôturée refusent toute mutation",
    context => {
        const fixture =
            createSceneFixture(context);

        const same =
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("A")
                );

        assert.equal(same.moved, false);
        assert.equal(
            same.reason,
            "same_channel"
        );
        assert.equal(
            fixture.linkHistory().length,
            1
        );

        fixture.manager.closeScene(
            fixture.scene.id
        );
        const closed =
            fixture.manager
                .moveSceneIfCurrent(
                    fixture.move("B")
                );

        assert.equal(closed.moved, false);
        assert.equal(
            closed.reason,
            "stale_source"
        );
        assert.equal(
            fixture.linksForScene(
                fixture.scene.id
            ).length,
            1
        );
    }
);

function createSceneFixture(context) {
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
        VALUES (
            'guild',
            'Greyline',
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
            channelId: "A",
            title: "Scène principale",
            createdBy: "player"
        });

    return {
        database:
            isolated.database,
        manager,
        scene,
        move:
            destinationChannelId => ({
                sceneId: scene.id,
                guildId: "guild",
                expectedSourceChannelId:
                    "A",
                destinationChannelId,
                transitionMessageId:
                    "transition",
                createdBy: "player"
            }),
        activeLinks:
            () => isolated.database
                .prepare(`
                    SELECT channel_id
                    FROM SceneChannelsV2
                    WHERE scene_id = ?
                    AND unlinked_at IS NULL
                    ORDER BY id
                `)
                .all(scene.id)
                .map(row => row.channel_id),
        linkHistory:
            () => isolated.database
                .prepare(`
                    SELECT *
                    FROM SceneChannelsV2
                    WHERE scene_id = ?
                    ORDER BY id
                `)
                .all(scene.id),
        linksForScene:
            sceneId => isolated.database
                .prepare(`
                    SELECT *
                    FROM SceneChannelsV2
                    WHERE scene_id = ?
                    ORDER BY id
                `)
                .all(sceneId)
    };
}
