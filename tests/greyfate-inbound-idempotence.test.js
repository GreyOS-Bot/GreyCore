const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { createIsolatedDatabase, withMutedConsole } = require("./helpers/isolatedDatabase");

const repositoryPath = require.resolve("../src/v2/repositories/GreyFateRepository");
const servicePath = require.resolve("../src/v2/services/greyfate/GreyFateIntegrationService");

function fixture() {
    const isolated = createIsolatedDatabase();
    require("../src/database/schemaV2DiscordReferenceHealth")();
    delete require.cache[repositoryPath];
    delete require.cache[servicePath];
    for (const modulePath of [
        "../src/v2/repositories/DiscordReferenceHealthRepository",
        "../src/v2/core/services/DiscordReferenceHealthService",
        "../src/v2/core/services/DiscordChannelDiagnosticService",
        "../src/v2/core/services/DiscordReferenceResolverService"
    ]) delete require.cache[require.resolve(modulePath)];
    const repository = require(repositoryPath);
    repository.initializeSchema();
    const service = require(servicePath);
    process.env.GREYFATE_SHARED_SECRET = "test-secret";
    return {
        ...isolated,
        repository,
        service,
        cleanup() {
            delete require.cache[repositoryPath];
            delete require.cache[servicePath];
            delete process.env.GREYFATE_SHARED_SECRET;
            isolated.cleanup();
        }
    };
}

function response() {
    return {
        status: null,
        body: null,
        writeHead(status) { this.status = status; },
        end(body) { this.body = JSON.parse(body); }
    };
}

async function receive(service, payload) {
    const req = {
        method: "POST",
        url: "/integrations/greyfate/events",
        headers: { authorization: "Bearer test-secret" }
    };
    const res = response();
    const originalRead = service.read;
    service.read = async () => payload;
    try {
        await service.handleHttp(req, res);
        return res;
    } finally {
        service.read = originalRead;
    }
}

test("les claims GreyFate sont atomiques, persistants et protégés par leur token", () => {
    const f = fixture();
    try {
        const first = f.repository.claimOperation("operation", "GREYFATE_EVENT_STARTED", "2026-08-27T10:00:00.000Z");
        assert.equal(first.state, "claimed");
        assert.ok(first.claimToken);
        assert.equal(f.repository.claimOperation("operation", "GREYFATE_EVENT_STARTED").state, "processing");
        assert.equal(f.repository.claimOperation("operation", "GREYFATE_DUO_CLOSURE_DUE").state, "key_conflict");
        assert.equal(f.repository.releaseClaim("operation", "wrong-token"), false);
        assert.equal(f.repository.completeOperation("operation", "GREYFATE_EVENT_STARTED", "wrong-token"), false);
        assert.equal(f.repository.markClaimUncertain("operation", "wrong-token", "error"), false);

        delete require.cache[repositoryPath];
        const reconnected = require(repositoryPath);
        reconnected.initializeSchema();
        assert.equal(reconnected.claimOperation("operation", "GREYFATE_EVENT_STARTED").state, "processing");
        assert.equal(reconnected.completeOperation("operation", "GREYFATE_EVENT_STARTED", first.claimToken), true);
        assert.equal(reconnected.hasOperation("operation"), true);
        assert.equal(reconnected.claimOperation("operation", "GREYFATE_EVENT_STARTED").state, "completed");
        assert.equal(reconnected.claimOperation("operation", "GREYFATE_EVENT_CONTINUED").state, "key_conflict");
        assert.equal(f.database.prepare("SELECT COUNT(*) count FROM GreyFateOperationClaims").get().count, 0);
    } finally {
        f.cleanup();
    }
});

test("le bootstrap additif conserve les anciennes opérations terminées", () => {
    const isolated = createIsolatedDatabase();
    try {
        isolated.database.exec(`
            CREATE TABLE GreyFateOperations (
                operation_key TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                processed_at TEXT NOT NULL
            )
        `);
        isolated.database.prepare("INSERT INTO GreyFateOperations VALUES(?,?,?)")
            .run("legacy", "GREYFATE_EVENT_COMPLETED", "2026-01-01T00:00:00.000Z");
        delete require.cache[repositoryPath];
        const repository = require(repositoryPath);
        repository.initializeSchema();
        assert.equal(repository.claimOperation("legacy", "GREYFATE_EVENT_COMPLETED").state, "completed");
        assert.equal(isolated.database.prepare("SELECT processed_at FROM GreyFateOperations WHERE operation_key='legacy'").get().processed_at, "2026-01-01T00:00:00.000Z");
        assert.ok(isolated.database.prepare("SELECT name FROM sqlite_master WHERE name='GreyFateOperationClaims'").get());
    } finally {
        delete require.cache[repositoryPath];
        isolated.cleanup();
    }
});

test("la finalisation GreyFate est transactionnelle et conserve le claim si l’historique entre en conflit", () => {
    const f = fixture();
    try {
        const claim = f.repository.claimOperation("race", "GREYFATE_EVENT_STARTED");
        f.repository.storeOperation("race", "GREYFATE_EVENT_STARTED", new Date().toISOString());
        assert.throws(
            () => f.repository.completeOperation("race", "GREYFATE_EVENT_STARTED", claim.claimToken),
            /UNIQUE constraint failed/
        );
        assert.equal(f.database.prepare("SELECT status FROM GreyFateOperationClaims WHERE operation_key='race'").get().status, "processing");
    } finally {
        f.cleanup();
    }
});

test("un claim incertain reste bloquant sans TTL et masque les diagnostics sensibles", () => {
    const f = fixture();
    try {
        const claim = f.repository.claimOperation("uncertain", "GREYFATE_EVENT_STARTED", "2000-01-01T00:00:00.000Z");
        assert.equal(
            f.repository.markClaimUncertain("uncertain", claim.claimToken, new Error("Bearer test-secret panne")),
            true
        );
        const stored = f.database.prepare("SELECT * FROM GreyFateOperationClaims WHERE operation_key='uncertain'").get();
        assert.equal(stored.status, "failed_uncertain");
        assert.doesNotMatch(stored.last_error, /test-secret/);
        assert.equal(f.repository.claimOperation("uncertain", "GREYFATE_EVENT_STARTED").state, "failed_uncertain");
        assert.equal(f.repository.releaseClaim("uncertain", "wrong-token"), false);
    } finally {
        f.cleanup();
    }
});

test("deux réceptions simultanées n’exécutent process qu’une fois puis deviennent duplicate", async () => {
    const f = fixture();
    try {
        let release;
        let started;
        const gate = new Promise(resolve => { release = resolve; });
        const entered = new Promise(resolve => { started = resolve; });
        let count = 0;
        f.service.process = async () => {
            count += 1;
            started();
            await gate;
        };
        const payload = { operationKey: "same", type: "GREYFATE_EVENT_CONTINUED" };
        const firstPromise = receive(f.service, payload);
        await entered;
        const second = await receive(f.service, payload);
        assert.equal(second.status, 409);
        assert.equal(second.body.error, "OPERATION_IN_PROGRESS");
        release();
        const first = await firstPromise;
        assert.equal(first.status, 200);
        assert.equal(count, 1);
        const replay = await receive(f.service, payload);
        assert.deepEqual(replay.body, { ok: true, duplicate: true });
        const conflict = await receive(f.service, {
            operationKey: "same",
            type: "GREYFATE_EVENT_STARTED"
        });
        assert.equal(conflict.status, 409);
        assert.equal(conflict.body.error, "OPERATION_KEY_CONFLICT");
        assert.equal(count, 1);
    } finally {
        f.cleanup();
    }
});

test("les payloads invalides et types inconnus ne créent aucun claim", async () => {
    const f = fixture();
    try {
        for (const payload of [
            null,
            { operationKey: 12, type: "GREYFATE_EVENT_STARTED" },
            { operationKey: "   ", type: "GREYFATE_EVENT_STARTED" },
            { operationKey: "unknown", type: "UNKNOWN" }
        ]) {
            const res = await receive(f.service, payload);
            assert.equal(res.status, 400);
            assert.equal(res.body.error, "INVALID_PAYLOAD");
        }
        assert.equal(f.database.prepare("SELECT COUNT(*) count FROM GreyFateOperationClaims").get().count, 0);
    } finally {
        f.cleanup();
    }
});

test("un échec avant effet libère le claim, un échec externe incertain le bloque", async () => {
    const f = fixture();
    try {
        let attempts = 0;
        f.service.process = async (payload, state) => {
            attempts += 1;
            if (payload.operationKey === "retry" && attempts === 1) throw new Error("DB temporairement indisponible");
            if (payload.operationKey === "uncertain-http") {
                state.externalEffectAttempted = true;
                throw new Error("Discord timeout");
            }
        };
        const retryPayload = { operationKey: "retry", type: "GREYFATE_EVENT_COMPLETED" };
        assert.equal((await withMutedConsole(() => receive(f.service, retryPayload))).status, 503);
        assert.equal((await receive(f.service, retryPayload)).status, 200);

        const uncertainPayload = { operationKey: "uncertain-http", type: "GREYFATE_EVENT_COMPLETED" };
        const uncertain = await withMutedConsole(() => receive(f.service, uncertainPayload));
        assert.equal(uncertain.status, 500);
        assert.equal(uncertain.body.error, "OPERATION_STATE_UNCERTAIN");
        const blocked = await receive(f.service, uncertainPayload);
        assert.equal(blocked.status, 409);
        assert.equal(blocked.body.error, "OPERATION_REQUIRES_REVIEW");
    } finally {
        f.cleanup();
    }
});

test("EVENT_STARTED et CLOSURE_DUE concurrents ne doublent ni bienvenue ni prompt", async () => {
    const f = fixture();
    try {
        f.service.client = { channels: { fetch: async id => ({ id, guildId: "guild" }) } };
        let sends = 0;
        let release;
        let entered;
        let gate = new Promise(resolve => { release = resolve; });
        let started = new Promise(resolve => { entered = resolve; });
        f.service.sendAsWeaver = async () => { sends += 1; entered(); await gate; };
        const event = {
            operationKey: "start-event",
            type: "GREYFATE_EVENT_STARTED",
            eventId: "event",
            guildId: "guild",
            duos: [{ duoId: "duo", threadId: "thread", maleUserId: "m", femaleUserId: "f", maleCharacter: "A", femaleCharacter: "B" }]
        };
        const startFirst = receive(f.service, event);
        await started;
        assert.equal((await receive(f.service, event)).body.error, "OPERATION_IN_PROGRESS");
        release();
        assert.equal((await startFirst).status, 200);
        assert.equal(sends, 1);

        gate = new Promise(resolve => { release = resolve; });
        started = new Promise(resolve => { entered = resolve; });
        const closure = { operationKey: "closure", type: "GREYFATE_DUO_CLOSURE_DUE", duoId: "duo" };
        const closeFirst = receive(f.service, closure);
        await started;
        assert.equal((await receive(f.service, closure)).body.error, "OPERATION_IN_PROGRESS");
        release();
        assert.equal((await closeFirst).status, 200);
        assert.equal(sends, 2);
    } finally {
        f.cleanup();
    }
});
