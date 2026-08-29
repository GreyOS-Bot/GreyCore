const test = require("node:test");
const assert = require("node:assert/strict");
const { ChannelType, Collection } = require("discord.js");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function fixture() {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    for (const path of [
        "../src/v2/repositories/PublicPlaceRepository",
        "../src/v2/repositories/DiscordReferenceHealthRepository",
        "../src/v2/core/services/DiscordReferenceHealthService",
        "../src/v2/core/services/DiscordChannelDiagnosticService",
        "../src/v2/core/services/DiscordReferenceResolverService",
        "../src/v2/services/publicPlaces/PublicPlaceForumService"
    ]) delete require.cache[require.resolve(path)];
    return {
        ...isolated,
        repository: require("../src/v2/repositories/PublicPlaceRepository"),
        health: require("../src/v2/core/services/DiscordReferenceHealthService"),
        service: require("../src/v2/services/publicPlaces/PublicPlaceForumService")
    };
}

function thread(id, name = id, archived = false) {
    return { id, name, archived, parentId: "forum", type: ChannelType.PublicThread, isTextBased: () => true };
}

function forum({ active = [], archivedPages = [[]], fetchPost = async () => null }) {
    let activeReads = 0;
    let archiveReads = 0;
    let postReads = 0;
    const guild = {
        id: "guild",
        channels: {
            cache: new Collection(),
            fetch: async id => { postReads += 1; return fetchPost(id); }
        }
    };
    const target = {
        id: "forum", guildId: "guild", guild,
        type: ChannelType.GuildForum,
        isTextBased: () => false,
        isThread: () => false,
        threads: {
            fetchActive: async () => {
                activeReads += 1;
                if (active instanceof Error) throw active;
                return { threads: new Collection(active.map(item => [item.id, item])) };
            },
            fetchArchived: async () => {
                const page = archivedPages[archiveReads++];
                if (page instanceof Error) throw page;
                const items = page || [];
                return {
                    threads: new Collection(items.map(item => [item.id, item])),
                    hasMore: archiveReads < archivedPages.length
                };
            }
        }
    };
    return {
        target,
        reads: () => ({ active: activeReads, archived: archiveReads, posts: postReads })
    };
}

function discordError(code) {
    const error = new Error(`Discord ${code}`);
    error.code = code;
    return error;
}

function seed(f) {
    f.repository.upsertMany("guild", "forum", [
        { id: "P1", name: "Ancien P1", archived: false },
        { id: "P2", name: "P2", archived: false },
        { id: "P3", name: "P3", archived: false }
    ]);
    f.repository.setCategory("guild", "P3", "quartier");
}

test("un snapshot partiel met à jour les éléments vus sans diagnostiquer les absents", async context => {
    const f = fixture();
    context.after(() => f.cleanup());
    seed(f);
    const target = forum({
        active: [thread("P1", "Nouveau P1")],
        archivedPages: [discordError(50001)]
    });

    const result = await f.service.synchronizeWithStatus("guild", target.target, {
        automatic: true,
        now: new Date("2026-08-28T10:00:00Z")
    });

    assert.equal(result.complete, false);
    assert.equal(result.places.length, 3);
    assert.equal(result.places.find(item => item.channel_id === "P1").name, "Nouveau P1");
    assert.equal(result.places.find(item => item.channel_id === "P3").category, "quartier");
    assert.equal(target.reads().posts, 0);
    assert.equal(f.database.prepare("SELECT COUNT(*) count FROM DiscordReferenceHealth WHERE owner_key LIKE 'place:%'").get().count, 0);
    assert.equal(f.health.get(f.service.forumReference("guild", "forum")).status, "missing_access");
});

test("les erreurs de lecture du forum conservent leur classification sans toucher aux lieux", async context => {
    for (const [code, status] of [
        [10003, "unknown_channel"],
        [50001, "missing_access"],
        [50013, "missing_permissions"],
        [12345, "discord_error"]
    ]) {
        const f = fixture();
        context.after(() => f.cleanup());
        seed(f);
        const target = forum({
            active: discordError(code),
            archivedPages: [[]]
        });
        const result = await f.service.synchronizeWithStatus("guild", target.target, {
            automatic: true,
            now: new Date("2026-08-28T10:00:00Z")
        });
        assert.equal(result.complete, false);
        assert.equal(result.places.length, 3);
        assert.equal(f.health.get(f.service.forumReference("guild", "forum")).status, status);
        assert.equal(target.reads().posts, 0);
    }
});

test("un inventaire complet confirme individuellement les absents sans supprimer les lieux", async context => {
    for (const [code, status] of [[10003, "unknown_channel"], [50001, "missing_access"], [50013, "missing_permissions"]]) {
        const f = fixture();
        context.after(() => f.cleanup());
        seed(f);
        const target = forum({
            active: [thread("P1"), thread("P2")],
            archivedPages: [[]],
            fetchPost: async () => { throw discordError(code); }
        });

        const result = await f.service.synchronizeWithStatus("guild", target.target, {
            automatic: true,
            now: new Date("2026-08-28T10:00:00Z")
        });

        assert.equal(result.complete, true);
        assert.equal(result.places.length, 3);
        assert.equal(result.places.find(item => item.channel_id === "P3").category, "quartier");
        assert.equal(f.health.get(f.service.placeReference("guild", "P3")).status, status);
        assert.equal(target.reads().posts, 1);
    }
});

test("le cooldown du forum et des posts évite les lectures répétées puis permet la résolution", async context => {
    const f = fixture();
    context.after(() => f.cleanup());
    seed(f);
    f.health.recordFailure(
        f.service.forumReference("guild", "forum"),
        { status: "unknown_channel" },
        "2026-08-28T10:00:00Z"
    );
    const target = forum({
        active: [thread("P1"), thread("P2"), thread("P3", "P3 revenu")],
        archivedPages: [[]]
    });

    const deferred = await f.service.synchronizeWithStatus("guild", target.target, {
        automatic: true,
        now: new Date("2026-08-28T10:01:00Z")
    });
    assert.equal(deferred.complete, false);
    assert.deepEqual(target.reads(), { active: 0, archived: 0, posts: 0 });
    assert.equal(deferred.places.length, 3);

    const restored = await f.service.synchronizeWithStatus("guild", target.target, {
        automatic: true,
        now: new Date("2026-08-28T16:00:00Z")
    });
    assert.equal(restored.complete, true);
    assert.equal(f.health.get(f.service.forumReference("guild", "forum")).status, "resolved");
});

test("le cooldown individuel d'un candidat n'empêche pas les autres vérifications", async context => {
    const f = fixture();
    context.after(() => f.cleanup());
    seed(f);
    f.repository.upsertMany("guild", "forum", [
        { id: "P4", name: "P4", archived: false }
    ]);
    f.health.recordFailure(
        f.service.placeReference("guild", "P3"),
        { status: "unknown_channel" },
        "2026-08-28T10:00:00Z"
    );
    const fetched = [];
    const target = forum({
        active: [thread("P1"), thread("P2")],
        archivedPages: [[]],
        fetchPost: async id => {
            fetched.push(id);
            if (id === "P4") throw discordError(50001);
            return thread(id, `${id} revenu`);
        }
    });

    await f.service.synchronizeWithStatus("guild", target.target, {
        automatic: true,
        now: new Date("2026-08-28T10:01:00Z")
    });
    assert.deepEqual(fetched, ["P4"]);
    assert.equal(f.health.get(f.service.placeReference("guild", "P3")).status, "unknown_channel");
    assert.equal(f.health.get(f.service.placeReference("guild", "P4")).status, "missing_access");

    await f.service.synchronizeWithStatus("guild", target.target, {
        automatic: true,
        now: new Date("2026-08-28T16:00:00Z")
    });
    assert.ok(fetched.includes("P3"));
    assert.equal(f.health.get(f.service.placeReference("guild", "P3")).status, "resolved");
    assert.equal(f.repository.getByForum("guild", "forum").length, 4);
});

test("un post archivé ou encore accessible reste sain et conserve son identité", async context => {
    const f = fixture();
    context.after(() => f.cleanup());
    seed(f);
    const target = forum({
        active: [thread("P1")],
        archivedPages: [[thread("P2", "P2 archivé", true)]],
        fetchPost: async id => thread(id, "P3 ciblé", false)
    });

    const result = await f.service.synchronizeWithStatus("guild", target.target, {
        automatic: true,
        now: new Date("2026-08-28T10:00:00Z")
    });

    assert.equal(result.complete, true);
    assert.equal(result.places.find(item => item.channel_id === "P2").is_archived, 1);
    assert.equal(result.places.find(item => item.channel_id === "P3").name, "P3 ciblé");
    assert.equal(f.health.get(f.service.placeReference("guild", "P2")), null);
    assert.equal(f.health.get(f.service.placeReference("guild", "P3")).status, "resolved");
});
