const test = require("node:test");
const assert = require("node:assert/strict");
const { ChannelType } = require("discord.js");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");
const { stubModule } = require("./helpers/moduleStub");

function clearSchedulerStack() {
    for (const path of [
        "../src/v2/repositories/DiscordReferenceHealthRepository",
        "../src/v2/core/services/DiscordReferenceHealthService",
        "../src/v2/core/services/DiscordChannelDiagnosticService",
        "../src/v2/core/services/DiscordReferenceResolverService",
        "../src/v2/services/entities/NarrativeEntityEventScheduler"
    ]) delete require.cache[require.resolve(path)];
}

test("les scopes cassés sont mémorisés et temporisés sans mutation métier", async context => {
    const isolated = createIsolatedDatabase();
    context.after(() => isolated.cleanup());
    isolated.database.exec("CREATE TABLE Guilds (id TEXT PRIMARY KEY)");
    require("../src/database/schemaV2Entities")();
    require("../src/database/schemaV2DiscordReferenceHealth")();
    isolated.database.prepare("INSERT INTO Guilds (id) VALUES ('guild')").run();
    isolated.database.prepare(`INSERT INTO NarrativeEntitiesV2
        (id,guild_id,name,created_at,updated_at) VALUES ('entity','guild','Oracle','now','now')`).run();
    isolated.database.prepare(`INSERT INTO NarrativeEntityEventsV2
        (id,guild_id,entity_id,name,time_rule,created_at,updated_at)
        VALUES ('event','guild','entity','Cycle','12:00','now','now')`).run();
    for (const id of ["10003", "50001", "50013", "generic"]) {
        isolated.database.prepare(`INSERT INTO NarrativeEntityEventScopesV2
            (event_id,channel_id,created_at) VALUES ('event',?,'now')`).run(id);
    }

    const modes = new Map([["10003", 10003], ["50001", 50001], ["50013", 50013], ["generic", 12345]]);
    const fetches = new Map();
    const guild = {
        id: "guild",
        channels: {
            cache: new Map(),
            fetch: async id => {
                fetches.set(id, (fetches.get(id) || 0) + 1);
                const mode = modes.get(id);
                if (mode) {
                    const error = new Error(`Discord ${mode}`);
                    error.code = mode;
                    throw error;
                }
                return { id, guildId: "guild", type: ChannelType.GuildText, isTextBased: () => true };
            }
        }
    };
    stubModule("src/v2/managers/NarrativeEntityEventManager.js", { getEnabled: () => [] });
    stubModule("src/v2/repositories/NarrativeEntityEventRepository.js", {});
    stubModule("src/v2/services/entities/NarrativeEntityService.js", {});
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ error: () => {} }) });
    clearSchedulerStack();
    const scheduler = require("../src/v2/services/entities/NarrativeEntityEventScheduler");
    const scopes = [...modes.keys()];
    const event = { id: "event", guild_id: "guild" };

    assert.deepEqual(await scheduler.resolveChannels(guild, scopes, event, new Date("2026-08-28T10:00:00Z")), []);
    assert.deepEqual(await scheduler.resolveChannels(guild, scopes, event, new Date("2026-08-28T10:01:00Z")), []);
    assert.ok([...fetches.values()].every(count => count === 1));
    assert.deepEqual(isolated.database.prepare(`SELECT channel_id,status FROM NarrativeEntityEventScopesV2
        LEFT JOIN DiscordReferenceHealth ON discord_id=channel_id
        ORDER BY channel_id`).all(), [
        { channel_id: "10003", status: "unknown_channel" },
        { channel_id: "50001", status: "missing_access" },
        { channel_id: "50013", status: "missing_permissions" },
        { channel_id: "generic", status: "discord_error" }
    ]);

    modes.clear();
    const restored = await scheduler.resolveChannels(guild, scopes, event, new Date("2026-08-29T10:00:00Z"));
    assert.equal(restored.length, 4);
    assert.ok(isolated.database.prepare("SELECT status FROM DiscordReferenceHealth").all()
        .every(row => row.status === "resolved"));
    assert.equal(isolated.database.prepare("SELECT COUNT(*) count FROM NarrativeEntityEventScopesV2").get().count, 4);
});

test("une destination morte ou en cooldown ne bloque ni les autres scopes ni leurs claims", async () => {
    const claimed = [];
    const sent = [];
    const runs = [];
    const channels = new Map([
        ["A", { id: "A", guildId: "guild", type: ChannelType.GuildText, isTextBased: () => true }],
        ["C", { id: "C", guildId: "guild", type: ChannelType.GuildForum, isTextBased: () => false }]
    ]);
    stubModule("src/v2/core/services/DiscordReferenceResolverService.js", {
        resolve: async reference => reference.discordId === "B"
            ? { checked: false, available: false }
            : { checked: true, available: true, channel: channels.get(reference.discordId) }
    });
    stubModule("src/v2/managers/NarrativeEntityEventManager.js", {
        getEnabled: () => [{
            id: "event", guild_id: "guild", entity_id: "entity", name: "Annonce",
            scopes: ["A", "B", "C"], calendar_rule: "always", weekday_rule: "*",
            time_rule: "12:00", timezone: "UTC", message_content: "Message"
        }]
    });
    stubModule("src/v2/repositories/NarrativeEntityEventRepository.js", {
        claimRun: (eventId, runKey, channelId) => { claimed.push(channelId); return true; },
        completeRun: (eventId, runKey, channelId) => runs.push([channelId, "sent"]),
        failRun: (eventId, runKey, channelId) => runs.push([channelId, "failed"])
    });
    stubModule("src/v2/services/entities/NarrativeEntityService.js", {
        sendEntity: async payload => { sent.push(payload); return { id: `message-${payload.channel.id}` }; }
    });
    stubModule("src/v2/services/entities/NarrativeEventSchedule.js", { matchSchedule: () => "run" });
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ error: () => {} }) });
    delete require.cache[require.resolve("../src/v2/services/entities/NarrativeEntityEventScheduler")];
    const scheduler = require("../src/v2/services/entities/NarrativeEntityEventScheduler");
    scheduler.client = { guilds: { cache: new Map([["guild", { id: "guild", channels: { cache: new Map() } }]]) } };

    await scheduler.tick(new Date("2026-08-28T12:00:00Z"));

    assert.deepEqual(claimed, ["A", "C"]);
    assert.deepEqual(sent.map(item => item.channel.id), ["A", "C"]);
    assert.equal(sent[1].threadName, "Annonce", "un forum parent sain conserve la création de post");
    assert.deepEqual(runs, [["A", "sent"], ["C", "sent"]]);
});
