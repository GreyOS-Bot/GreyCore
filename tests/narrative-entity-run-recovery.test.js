const test = require("node:test");
const assert = require("node:assert/strict");
const { ChannelType } = require("discord.js");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");
const { stubModule } = require("./helpers/moduleStub");

function clear(modulePath) {
    delete require.cache[require.resolve(modulePath)];
}

function seedEntitySchema(database) {
    database.exec("CREATE TABLE Guilds (id TEXT PRIMARY KEY)");
    require("../src/database/schemaV2Entities")();
    database.prepare("INSERT INTO Guilds (id) VALUES ('guild')").run();
    database.prepare(`INSERT INTO NarrativeEntitiesV2
        (id,guild_id,name,created_at,updated_at)
        VALUES ('entity','guild','Oracle','now','now')`).run();
    database.prepare(`INSERT INTO NarrativeEntityEventsV2
        (id,guild_id,entity_id,name,time_rule,created_at,updated_at)
        VALUES ('event','guild','entity','Cycle','12:00','now','now')`).run();
    database.prepare(`INSERT INTO NarrativeEntityEventScopesV2
        (event_id,channel_id,created_at) VALUES ('event','channel','now')`).run();
}

test("le bootstrap conserve les runs legacy et laisse leur tentative inconnue", context => {
    const isolated = createIsolatedDatabase();
    context.after(() => isolated.cleanup());
    isolated.database.exec(`
        CREATE TABLE Guilds (id TEXT PRIMARY KEY);
        CREATE TABLE NarrativeEntitiesV2 (
            id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, name TEXT NOT NULL,
            avatar_url TEXT, embed_color INTEGER NOT NULL DEFAULT 5793266,
            description TEXT, is_enabled INTEGER NOT NULL DEFAULT 1,
            created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE NarrativeEntityEventsV2 (
            id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, entity_id TEXT NOT NULL,
            name TEXT NOT NULL, calendar_rule TEXT NOT NULL DEFAULT 'always',
            weekday_rule TEXT NOT NULL DEFAULT '*', time_rule TEXT NOT NULL,
            timezone TEXT NOT NULL DEFAULT 'Europe/Paris', message_content TEXT,
            action_key TEXT NOT NULL DEFAULT 'none', action_payload TEXT,
            is_enabled INTEGER NOT NULL DEFAULT 1, last_run_key TEXT,
            created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE NarrativeEntityEventRunsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL,
            run_key TEXT NOT NULL, channel_id TEXT, message_id TEXT,
            status TEXT NOT NULL, error_message TEXT, created_at TEXT NOT NULL,
            UNIQUE(event_id, run_key, channel_id)
        );
        INSERT INTO NarrativeEntityEventRunsV2
            (event_id,run_key,channel_id,status,created_at) VALUES
            ('event','success','A','sent','old'),
            ('event','failed','B','failed','old'),
            ('event','running','C','running','old');
    `);

    clear("../src/database/schemaV2Entities");
    require("../src/database/schemaV2Entities")();
    require("../src/database/schemaV2Entities")();

    const rows = isolated.database.prepare(`SELECT run_key,status,attempt_token,
        external_effect_attempted,lease_at FROM NarrativeEntityEventRunsV2 ORDER BY id`).all();
    assert.deepEqual(rows, [
        { run_key: "success", status: "sent", attempt_token: null, external_effect_attempted: null, lease_at: null },
        { run_key: "failed", status: "failed", attempt_token: null, external_effect_attempted: null, lease_at: null },
        { run_key: "running", status: "running", attempt_token: null, external_effect_attempted: null, lease_at: null }
    ]);
});

test("les transitions sont protégées par le token et une récupération stale n'a qu'un gagnant", context => {
    const isolated = createIsolatedDatabase();
    context.after(() => isolated.cleanup());
    seedEntitySchema(isolated.database);
    clear("../src/v2/repositories/NarrativeEntityEventRepository");
    const repository = require("../src/v2/repositories/NarrativeEntityEventRepository");
    const oldLease = "2026-08-29T10:00:00.000Z";
    const staleBefore = "2026-08-29T10:05:00.000Z";
    const token = repository.claimRun("event", "run", "channel", oldLease);
    const runId = isolated.database.prepare("SELECT id FROM NarrativeEntityEventRunsV2").get().id;

    const winner = repository.recoverRun(runId, token, staleBefore, "2026-08-29T10:10:00.000Z");
    assert.ok(winner);
    assert.equal(repository.recoverRun(runId, token, staleBefore, "2026-08-29T10:10:00.000Z"), null);
    assert.equal(repository.markExternalEffectAttempted("event", "run", "channel", token, "now"), false);
    assert.equal(repository.completeRun("event", "run", "channel", token, "old-message", "now"), false);
    assert.equal(repository.failRun("event", "run", "channel", token, "old failure", "now"), false);
    assert.equal(repository.markExternalEffectAttempted("event", "run", "channel", winner, "now"), true);
    assert.equal(repository.completeRun("event", "run", "channel", winner, "message", "now"), true);

    const row = isolated.database.prepare(`SELECT status,message_id,attempt_token,
        external_effect_attempted FROM NarrativeEntityEventRunsV2`).get();
    assert.deepEqual(row, {
        status: "sent", message_id: "message", attempt_token: winner,
        external_effect_attempted: 1
    });
});

test("une erreur avant envoi reste failed et une erreur après tentative devient failed_uncertain", async () => {
    const failures = [];
    const repository = {
        markExternalEffectAttempted: () => true,
        completeRun: () => { throw new Error("ne doit pas réussir"); },
        failRun: (...args) => failures.push({ uncertain: args[6], error: args[4] })
    };
    stubModule("src/v2/managers/NarrativeEntityEventManager.js", { getEnabled: () => [] });
    stubModule("src/v2/repositories/NarrativeEntityEventRepository.js", repository);
    stubModule("src/v2/core/services/DiscordReferenceResolverService.js", {});
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ error: () => {} }) });

    let mode = "before";
    stubModule("src/v2/services/entities/NarrativeEntityService.js", {
        sendEntity: async payload => {
            if (mode === "before") throw new Error("résolution impossible");
            payload.onBeforeSendAttempt();
            throw new Error("réponse Discord incertaine");
        }
    });
    clear("../src/v2/services/entities/NarrativeEntityEventScheduler");
    const scheduler = require("../src/v2/services/entities/NarrativeEntityEventScheduler");
    const event = { id: "event", entity_id: "entity", name: "Cycle" };
    const channel = { id: "channel", type: ChannelType.GuildText };

    await scheduler.executeRun(event, "run-before", channel, "token-before");
    mode = "after";
    await scheduler.executeRun(event, "run-after", channel, "token-after");

    assert.deepEqual(failures, [
        { uncertain: false, error: "résolution impossible" },
        { uncertain: true, error: "réponse Discord incertaine" }
    ]);
});

test("les runs stale legacy ou déjà tentés deviennent incertains sans être rejoués", context => {
    const isolated = createIsolatedDatabase();
    context.after(() => isolated.cleanup());
    seedEntitySchema(isolated.database);
    clear("../src/v2/repositories/NarrativeEntityEventRepository");
    const repository = require("../src/v2/repositories/NarrativeEntityEventRepository");
    isolated.database.prepare(`INSERT INTO NarrativeEntityEventRunsV2
        (event_id,run_key,channel_id,status,attempt_token,external_effect_attempted,lease_at,created_at)
        VALUES ('event','legacy','legacy','running',NULL,NULL,NULL,'old'),
               ('event','attempted','attempted','running','token',1,'2026-08-29T10:00:00.000Z','old')`).run();

    for (const run of repository.getStaleRunningRuns("2026-08-29T10:05:00.000Z")) {
        assert.equal(repository.markStaleRunUncertain(
            run.id, "2026-08-29T10:05:00.000Z", "2026-08-29T10:10:00.000Z"
        ), true);
    }
    assert.deepEqual(
        isolated.database.prepare("SELECT status FROM NarrativeEntityEventRunsV2 ORDER BY id").all(),
        [{ status: "failed_uncertain" }, { status: "failed_uncertain" }]
    );
});

test("un run safe stale est récupéré hors fenêtre normale et envoyé une seule fois", async () => {
    const calls = [];
    const channel = {
        id: "channel", guildId: "guild", type: ChannelType.GuildText,
        isTextBased: () => true
    };
    const run = {
        id: 1, event_id: "event", run_key: "ancienne-minute", channel_id: "channel",
        attempt_token: "old-token", external_effect_attempted: 0, guild_id: "guild"
    };
    const event = {
        id: "event", guild_id: "guild", entity_id: "entity", name: "Cycle",
        is_enabled: true, entity_enabled: true, scopes: ["channel"], message_content: "Annonce"
    };
    stubModule("src/v2/managers/NarrativeEntityEventManager.js", { getEnabled: () => [] });
    stubModule("src/v2/repositories/NarrativeEntityEventRepository.js", {
        getStaleRunningRuns: () => [run],
        recoverRun: () => "new-token",
        getById: () => event,
        markExternalEffectAttempted: (...args) => { calls.push(["attempted", args[3]]); return true; },
        completeRun: (...args) => { calls.push(["sent", args[3], args[4]]); return true; },
        failRun: (...args) => calls.push(["failed", args[3]]),
        markStaleRunUncertain: () => { throw new Error("ne doit pas être appelé"); }
    });
    stubModule("src/v2/services/entities/NarrativeEntityService.js", {
        sendEntity: async payload => {
            payload.onBeforeSendAttempt();
            calls.push(["webhook.send"]);
            return { id: "message" };
        }
    });
    stubModule("src/v2/services/entities/NarrativeEventSchedule.js", { matchSchedule: () => null });
    stubModule("src/v2/core/services/DiscordReferenceResolverService.js", {
        resolve: async () => ({ available: true, channel })
    });
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ error: () => {} }) });
    clear("../src/v2/services/entities/NarrativeEntityEventScheduler");
    const scheduler = require("../src/v2/services/entities/NarrativeEntityEventScheduler");
    scheduler.client = {
        guilds: { cache: new Map([["guild", { id: "guild", channels: { cache: new Map([["channel", channel]]) } }]]) }
    };

    await scheduler.tick(new Date("2026-08-29T10:10:00.000Z"));

    assert.deepEqual(calls, [
        ["attempted", "new-token"],
        ["webhook.send"],
        ["sent", "new-token", "message"]
    ]);
});

test("un run stale déjà tenté devient incertain sans second message", async () => {
    const calls = [];
    stubModule("src/v2/managers/NarrativeEntityEventManager.js", { getEnabled: () => [] });
    stubModule("src/v2/repositories/NarrativeEntityEventRepository.js", {
        getStaleRunningRuns: () => [{
            id: 1, attempt_token: "token", external_effect_attempted: 1
        }],
        markStaleRunUncertain: () => calls.push("uncertain")
    });
    stubModule("src/v2/services/entities/NarrativeEntityService.js", {
        sendEntity: async () => { calls.push("send"); }
    });
    stubModule("src/v2/services/entities/NarrativeEventSchedule.js", { matchSchedule: () => null });
    stubModule("src/v2/core/services/TechnicalLogger.js", { create: () => ({ error: () => {} }) });
    clear("../src/v2/services/entities/NarrativeEntityEventScheduler");
    const scheduler = require("../src/v2/services/entities/NarrativeEntityEventScheduler");
    scheduler.client = { guilds: { cache: new Map() } };

    await scheduler.tick(new Date("2026-08-29T10:10:00.000Z"));
    assert.deepEqual(calls, ["uncertain"]);
});
