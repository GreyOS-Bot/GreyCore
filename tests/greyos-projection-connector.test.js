const test = require("node:test");
const assert = require("node:assert/strict");

const connector = require(
    "../src/integrations/greyos/ProductProjectionPublisher.cjs"
);

const validEnvironment = {
    GREYCORE_GREYOS_CONNECTOR_ENABLED: "true",
    GREYCORE_GREYOS_CONNECTOR_ORIGIN: "http://127.0.0.1:3001",
    GREYCORE_GREYOS_CONNECTOR_INSTALLATION_ID: "greycore-production-main",
    GREYCORE_GREYOS_CONNECTOR_KEY_ID: "greycore-main",
    GREYCORE_GREYOS_CONNECTOR_SECRET: Buffer.alloc(32, 7).toString("base64url"),
    GREYLINE_INSTALLATION_BINDING_KEY: Buffer.alloc(32, 8).toString("base64url"),
    GREYCORE_GREYOS_CONNECTOR_INTERVAL_MS: "120000"
};

test("le connecteur GreyOS est désactivé sans configuration explicite", async () => {
    const publisher = connector.createPublisher({
        environment: {},
        database: null,
        client: null,
        productVersion: "1.0.0"
    });

    assert.equal(publisher.enabled, false);
    assert.deepEqual(await publisher.publishNow(), { skipped: true });
});

test("le connecteur GreyOS refuse toute destination non locale", () => {
    assert.throws(
        () => connector.configuration({
            ...validEnvironment,
            GREYCORE_GREYOS_CONNECTOR_ORIGIN: "https://example.test"
        }),
        /ORIGIN_NOT_LOOPBACK/
    );
});

test("la projection GreyOS ne contient que des compteurs agrégés", () => {
    const values = [31, 4, 18, 33];
    const database = {
        prepare: () => ({
            pluck: () => ({ get: () => values.shift() })
        })
    };

    const projection = connector.projection({
        installationId: "greycore-production-main",
        database,
        observedAt: "2026-08-20T00:00:00.000Z"
    });

    assert.equal(projection.privacy, "operational-aggregate");
    assert.deepEqual(
        projection.metrics.map(metric => [metric.key, metric.value]),
        [
            ["narrative.characters.total", 31],
            ["narrative.scenes.active", 4],
            ["narrative.relationships.total", 18],
            ["narrative.continuities.total", 33]
        ]
    );
    assert.equal(JSON.stringify(projection).includes("message"), false);
});

test("l’inventaire pseudonymise le serveur sans publier son identifiant ni son nom", () => {
    const guild = { id: "123456789012345678", name: "Serveur secret", memberCount: 42 };
    const pages = connector.inventoryPages({
        installationId: "greycore-production-main",
        productVersion: "1.0.0",
        bindingSecret: validEnvironment.GREYLINE_INSTALLATION_BINDING_KEY,
        client: {
            isReady: () => true,
            guilds: { cache: new Map([[guild.id, guild]]) }
        },
        observedAt: "2026-08-22T00:00:00.000Z"
    });

    assert.equal(pages.length, 1);
    assert.equal(pages[0].installations[0].metrics[0].value, 42);
    assert.equal(pages[0].installations[0].displayLabel, null);
    const serialized = JSON.stringify(pages);
    assert.equal(serialized.includes(guild.id), false);
    assert.equal(serialized.includes(guild.name), false);
});

test("le connecteur signe et publie le manifeste, la santé et la projection", async () => {
    const calls = [];
    const database = {
        prepare: query => ({
            pluck: () => ({ get: () => query === "SELECT 1" ? 1 : 2 })
        })
    };
    const publisher = connector.createPublisher({
        environment: validEnvironment,
        database,
        client: {
            isReady: () => true,
            guilds: { cache: new Map([["123", { id: "123", memberCount: 2 }]]) }
        },
        productVersion: "1.0.0",
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            return { ok: true, status: 200, text: async () => "{}" };
        }
    });

    assert.deepEqual(await publisher.publishNow(), { published: true });
    assert.equal(calls.length, 4);
    assert.deepEqual(
        calls.map(call => call.url.split("/").at(-1)),
        ["manifest", "health", "operational-projection", "installation-inventory"]
    );
    for (const call of calls) {
        assert.match(call.options.headers["X-GreyOS-Signature"], /^[A-Za-z0-9_-]+$/);
        assert.equal(call.options.headers["X-GreyOS-Installation-Id"], "greycore-production-main");
    }
});
