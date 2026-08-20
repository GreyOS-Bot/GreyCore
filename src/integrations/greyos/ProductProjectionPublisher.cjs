/* GreyCore production is a CommonJS service. */
const { createHash, createHmac, randomBytes } = require("node:crypto");

const PRODUCT = "greycore";
const CONTRACT_VERSION = "1.0.0";
const AGENT_VERSION = "1.7.0";
const DEFAULT_INTERVAL_MS = 120_000;
const MIN_INTERVAL_MS = 60_000;
const MAX_INTERVAL_MS = 900_000;
const CIRCUIT_FAILURES = 5;
const CIRCUIT_COOLDOWN_MS = 15 * 60_000;
const LOOPBACK_ORIGINS = new Set(["http://127.0.0.1:3001", "http://[::1]:3001"]);
const INSTALLATION_ID = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const KEY_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/;

const METRICS = Object.freeze([
    Object.freeze({ key: "narrative.characters.total", query: "SELECT COUNT(*) FROM CharactersV2 WHERE is_archived = 0" }),
    Object.freeze({ key: "narrative.scenes.active", query: "SELECT COUNT(*) FROM ScenesV2 WHERE lower(status) = 'active'" }),
    Object.freeze({ key: "narrative.relationships.total", query: "SELECT COUNT(*) FROM ContinuityRelationshipsV2" }),
    Object.freeze({ key: "narrative.continuities.total", query: "SELECT COUNT(*) FROM CharacterContinuitiesV2 WHERE is_archived = 0" })
]);

const enabled = value => String(value || "").trim().toLowerCase() === "true";
const safeVersion = value => typeof value === "string" && value.length > 0 && value.length <= 64
    ? value
    : "unknown";

function configuration(environment = process.env) {
    if (!enabled(environment.GREYCORE_GREYOS_CONNECTOR_ENABLED)) {
        return Object.freeze({ enabled: false });
    }
    const origin = String(environment.GREYCORE_GREYOS_CONNECTOR_ORIGIN || "http://127.0.0.1:3001")
        .replace(/\/$/, "");
    const installationId = String(
        environment.GREYCORE_GREYOS_CONNECTOR_INSTALLATION_ID || "greycore-production-main"
    );
    const keyId = String(environment.GREYCORE_GREYOS_CONNECTOR_KEY_ID || "");
    const secret = String(environment.GREYCORE_GREYOS_CONNECTOR_SECRET || "");
    const intervalMs = Number(
        environment.GREYCORE_GREYOS_CONNECTOR_INTERVAL_MS || DEFAULT_INTERVAL_MS
    );
    if (!LOOPBACK_ORIGINS.has(origin)) throw new Error("GREYCORE_CONNECTOR_ORIGIN_NOT_LOOPBACK");
    if (!INSTALLATION_ID.test(installationId)) throw new Error("GREYCORE_CONNECTOR_INSTALLATION_ID_INVALID");
    if (!KEY_ID.test(keyId)) throw new Error("GREYCORE_CONNECTOR_KEY_ID_INVALID");
    if (!/^[A-Za-z0-9_-]{43,}$/.test(secret) || Buffer.from(secret, "base64url").length < 32) {
        throw new Error("GREYCORE_CONNECTOR_SECRET_INVALID");
    }
    if (!Number.isSafeInteger(intervalMs) || intervalMs < MIN_INTERVAL_MS || intervalMs > MAX_INTERVAL_MS) {
        throw new Error("GREYCORE_CONNECTOR_INTERVAL_INVALID");
    }
    return Object.freeze({ enabled: true, origin, installationId, keyId, secret, intervalMs });
}

function count(database, query) {
    const value = Number(database.prepare(query).pluck().get());
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("GREYCORE_CONNECTOR_METRIC_INVALID");
    return value;
}

function readMetrics(database) {
    if (!database || typeof database.prepare !== "function") {
        throw new Error("GREYCORE_CONNECTOR_DATABASE_REQUIRED");
    }
    return METRICS.map(metric => ({
        key: metric.key,
        value: count(database, metric.query),
        unit: "count",
        aggregation: "latest"
    }));
}

function manifest({ installationId, productVersion, observedAt = new Date().toISOString() }) {
    return {
        schema: "greyos.product-manifest",
        contractVersion: CONTRACT_VERSION,
        product: PRODUCT,
        installationId,
        environment: "production",
        productVersion: safeVersion(productVersion),
        agentVersion: AGENT_VERSION,
        observedAt,
        capabilities: [
            { key: "health.read", access: "read", version: CONTRACT_VERSION },
            { key: "operational.metrics.read", access: "read", version: CONTRACT_VERSION }
        ],
        endpoints: { health: "/api/internal/v1/health" }
    };
}

function health({ installationId, database, client, observedAt = new Date().toISOString() }) {
    let databaseReady = false;
    try {
        databaseReady = Number(database.prepare("SELECT 1").pluck().get()) === 1;
    } catch {}
    const discordReady = Boolean(client?.isReady?.());
    return {
        schema: "greyos.product-health",
        contractVersion: CONTRACT_VERSION,
        product: PRODUCT,
        installationId,
        observedAt,
        status: databaseReady && discordReady ? "healthy" : "degraded",
        checks: [
            { key: "database", status: databaseReady ? "pass" : "fail", detailCode: databaseReady ? "DATABASE_READY" : "DATABASE_UNAVAILABLE" },
            { key: "discord", status: discordReady ? "pass" : "warn", detailCode: discordReady ? "DISCORD_READY" : "DISCORD_NOT_READY" }
        ]
    };
}

function projection({ installationId, database, observedAt = new Date().toISOString() }) {
    return {
        schema: "greyos.product-operational-projection",
        contractVersion: CONTRACT_VERSION,
        product: PRODUCT,
        installationId,
        observedAt,
        scope: { kind: "product", id: PRODUCT },
        metrics: readMetrics(database),
        privacy: "operational-aggregate"
    };
}

async function send({ config, kind, payload, fetchImpl }) {
    const path = `/api/internal/v1/products/connectors/${kind}`;
    const timestamp = Date.now().toString();
    const nonce = randomBytes(24).toString("base64url");
    const body = JSON.stringify(payload);
    const digest = createHash("sha256").update(body).digest("base64url");
    const canonical = [
        "greyos-connector-v1",
        config.installationId,
        config.keyId,
        timestamp,
        nonce,
        "POST",
        path,
        digest
    ].join("\n");
    const signature = createHmac("sha256", Buffer.from(config.secret, "base64url"))
        .update(canonical)
        .digest("base64url");
    const response = await fetchImpl(`${config.origin}${path}`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: {
            "Content-Type": "application/json",
            "X-GreyOS-Installation-Id": config.installationId,
            "X-GreyOS-Key-Id": config.keyId,
            "X-GreyOS-Timestamp": timestamp,
            "X-GreyOS-Nonce": nonce,
            "X-GreyOS-Signature": signature
        },
        body
    });
    const text = await response.text();
    if (text.length > 8192) throw new Error("GREYCORE_CONNECTOR_RESPONSE_TOO_LARGE");
    let result = null;
    try {
        result = text ? JSON.parse(text) : null;
    } catch {
        throw new Error("GREYCORE_CONNECTOR_RESPONSE_INVALID");
    }
    if (!response.ok) {
        throw new Error(
            typeof result?.error?.code === "string"
                ? result.error.code
                : `GREYCORE_CONNECTOR_HTTP_${response.status}`
        );
    }
    return result;
}

function createPublisher({
    database,
    client,
    productVersion,
    environment = process.env,
    fetchImpl = fetch,
    now = () => Date.now(),
    onState = () => {}
}) {
    const config = configuration(environment);
    if (!config.enabled) {
        return Object.freeze({
            enabled: false,
            publishNow: async () => ({ skipped: true }),
            start: () => null,
            stop: () => {}
        });
    }
    let timer = null;
    let consecutiveFailures = 0;
    let circuitOpenUntil = 0;
    let manifestPublished = false;
    const emitState = value => {
        try { onState(Object.freeze(value)); } catch {}
    };
    const publishNow = async () => {
        if (now() < circuitOpenUntil) return { skipped: true, reason: "CIRCUIT_OPEN" };
        try {
            if (!manifestPublished) {
                await send({
                    config,
                    kind: "manifest",
                    payload: manifest({ installationId: config.installationId, productVersion }),
                    fetchImpl
                });
                manifestPublished = true;
            }
            const healthPayload = health({ installationId: config.installationId, database, client });
            await send({ config, kind: "health", payload: healthPayload, fetchImpl });
            await send({
                config,
                kind: "operational-projection",
                payload: projection({ installationId: config.installationId, database }),
                fetchImpl
            });
            consecutiveFailures = 0;
            circuitOpenUntil = 0;
            emitState({ status: "published", observedAt: new Date(now()).toISOString() });
            return { published: true };
        } catch (error) {
            consecutiveFailures += 1;
            if (consecutiveFailures >= CIRCUIT_FAILURES) {
                circuitOpenUntil = now() + CIRCUIT_COOLDOWN_MS;
                consecutiveFailures = 0;
            }
            const errorCode = error instanceof Error && /^[A-Z0-9_:-]{2,96}$/.test(error.message)
                ? error.message
                : "GREYCORE_CONNECTOR_PUBLISH_FAILED";
            emitState({ status: "degraded", errorCode, circuitOpenUntil: circuitOpenUntil || null });
            return { published: false, errorCode };
        }
    };
    const start = () => {
        if (timer) return timer;
        void publishNow();
        timer = setInterval(() => void publishNow(), config.intervalMs);
        timer.unref?.();
        return timer;
    };
    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };
    return Object.freeze({ enabled: true, publishNow, start, stop });
}

function startGreyOSProjectionPublisher(options) {
    const publisher = createPublisher(options);
    publisher.start();
    return publisher;
}

module.exports = {
    AGENT_VERSION,
    METRICS,
    configuration,
    readMetrics,
    manifest,
    health,
    projection,
    createPublisher,
    startGreyOSProjectionPublisher
};
