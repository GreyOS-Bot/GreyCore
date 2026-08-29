const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function fixture() {
    const isolated = createIsolatedDatabase();
    require("../src/database/schemaV2DiscordReferenceHealth")();
    for (const path of [
        "../src/v2/repositories/DiscordReferenceHealthRepository",
        "../src/v2/core/services/DiscordReferenceHealthService",
        "../src/v2/core/services/DiscordChannelDiagnosticService",
        "../src/v2/core/services/DiscordReferenceResolverService"
    ]) delete require.cache[require.resolve(path)];
    return {
        ...isolated,
        resolver: require("../src/v2/core/services/DiscordReferenceResolverService"),
        health: require("../src/v2/core/services/DiscordReferenceHealthService")
    };
}

function reference(id = "thread") {
    return {
        domain: "greyfate",
        ownerKey: "duo:duo",
        resourceKind: "thread",
        discordId: id,
        guildId: "guild"
    };
}

test("la résolution mémorise chaque classification et respecte son cooldown", async context => {
    const f = fixture();
    context.after(() => f.cleanup());
    for (const [code, status] of [
        [10003, "unknown_channel"],
        [50001, "missing_access"],
        [50013, "missing_permissions"],
        [12345, "discord_error"]
    ]) {
        let fetches = 0;
        const target = reference(String(code));
        const client = { channels: { fetch: async () => {
            fetches += 1;
            const error = new Error(`Discord ${code}`);
            error.code = code;
            throw error;
        } } };
        const first = await f.resolver.resolve(target, { client }, {
            now: new Date("2026-08-28T10:00:00.000Z")
        });
        assert.equal(first.available, false);
        assert.equal(f.health.get(target).status, status);
        const deferred = await f.resolver.resolve(target, { client }, {
            now: new Date("2026-08-28T10:01:00.000Z")
        });
        assert.equal(deferred.checked, false);
        assert.equal(fetches, 1);
        await f.resolver.resolve(target, { client }, {
            now: new Date("2026-08-29T10:00:00.000Z")
        });
        assert.equal(fetches, 2);
    }
});

test("une référence redevenue accessible est résolue et restitue le canal", async context => {
    const f = fixture();
    context.after(() => f.cleanup());
    const target = reference();
    f.health.recordFailure(target, { status: "discord_error" }, "2026-08-28T10:00:00.000Z");
    const channel = { id: "thread", type: 11, archived: false, locked: false, isThread: () => true, isTextBased: () => true };
    const result = await f.resolver.resolve(target, {
        client: { channels: { fetch: async () => channel } }
    }, { now: new Date("2026-08-28T10:05:00.000Z") });
    assert.equal(result.channel, channel);
    assert.equal(f.health.get(target).status, "resolved");
});
