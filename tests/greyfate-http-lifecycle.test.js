const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const EventEmitter = require("node:events");

const {
    stubModule
} = require("./helpers/moduleStub");

class FakeServer extends EventEmitter {
    constructor(handler) {
        super();
        this.handler = handler;
        this.listening = false;
        this.listenCalls = [];
        this.closeCalls = 0;
        this.listenCallback = null;
    }

    listen(port, host, callback) {
        this.listenCalls.push([port, host]);
        this.listenCallback = callback;
        return this;
    }

    finishListen() {
        this.listening = true;
        this.listenCallback?.();
    }

    close(callback) {
        this.closeCalls += 1;
        this.listening = false;
        callback?.();
        return this;
    }
}

function fixture() {
    const originalCreateServer =
        http.createServer;
    const servers = [];
    const logs = [];

    http.createServer = handler => {
        const server =
            new FakeServer(handler);
        servers.push(server);
        return server;
    };

    stubModule(
        "src/v2/repositories/GreyFateRepository.js",
        {
            initializeSchema: () => {}
        }
    );
    stubModule(
        "src/v2/managers/NarrativeEntityV2Manager.js",
        {}
    );
    stubModule(
        "src/webhooks/webhookManager.js",
        {}
    );
    stubModule(
        "src/v2/core/services/DiscordThreadAccessService.js",
        {}
    );
    stubModule(
        "src/v2/core/services/DiscordReferenceResolverService.js",
        {}
    );
    stubModule(
        "src/v2/core/services/TechnicalLogger.js",
        {
            create: () => ({
                info: (...values) =>
                    logs.push(["info", ...values]),
                warn: (...values) =>
                    logs.push(["warn", ...values]),
                error: (...values) =>
                    logs.push(["error", ...values])
            })
        }
    );

    const servicePath =
        require.resolve(
            "../src/v2/services/greyfate/GreyFateIntegrationService"
        );
    delete require.cache[servicePath];

    process.env.GREYFATE_INTEGRATION_ENABLED = "true";
    process.env.GREYFATE_SHARED_SECRET = "secret";
    process.env.GREYCORE_FATE_PORT = "8790";

    return {
        service:
            require(servicePath),
        servers,
        logs,
        cleanup() {
            http.createServer =
                originalCreateServer;
            delete process.env.GREYFATE_INTEGRATION_ENABLED;
            delete process.env.GREYFATE_SHARED_SECRET;
            delete process.env.GREYCORE_FATE_PORT;
            delete require.cache[servicePath];
        }
    };
}

function response() {
    return {
        headersSent: false,
        writableEnded: false,
        status: null,
        body: null,
        writeHead(status) {
            this.status = status;
            this.headersSent = true;
        },
        end(body) {
            this.body = JSON.parse(body);
            this.writableEnded = true;
        }
    };
}

function flush() {
    return new Promise(
        resolve => setImmediate(resolve)
    );
}

test(
    "GreyFate réserve un seul serveur pour les démarrages concurrents",
    () => {
        const f = fixture();
        try {
            const first =
                f.service.start({ id: "client" });
            const second =
                f.service.start({ id: "client" });

            assert.equal(first, second);
            assert.equal(f.servers.length, 1);
            assert.equal(
                f.servers[0].listenCalls.length,
                1
            );
            assert.equal(f.service.starting, true);

            f.servers[0].finishListen();
            assert.equal(f.service.available, true);
            assert.equal(f.service.starting, false);
        } finally {
            f.cleanup();
        }
    }
);

test(
    "GreyFate isole EADDRINUSE et peut redémarrer ensuite",
    () => {
        const f = fixture();
        try {
            const server =
                f.service.start({});
            const error =
                new Error("secret technique");
            error.code = "EADDRINUSE";

            assert.doesNotThrow(
                () => server.emit("error", error)
            );
            assert.equal(f.service.server, null);
            assert.equal(f.service.available, false);
            assert.equal(f.service.starting, false);
            assert.equal(
                f.logs.some(
                    entry =>
                        entry.includes("EADDRINUSE")
                ),
                true
            );

            assert.ok(f.service.start({}));
            assert.equal(f.servers.length, 2);
        } finally {
            f.cleanup();
        }
    }
);

test(
    "une rejection HTTP inattendue produit seulement un 500 générique",
    async () => {
        const f = fixture();
        try {
            const server =
                f.service.start({});
            f.service.handleHttp = async () => {
                throw new Error(
                    "Bearer secret stack sensible"
                );
            };
            const res = response();

            server.handler({}, res);
            await flush();

            assert.equal(res.status, 500);
            assert.deepEqual(
                res.body,
                {
                    ok: false,
                    error: "INTERNAL_ERROR"
                }
            );
            assert.doesNotMatch(
                JSON.stringify(res.body),
                /secret|stack|Bearer/
            );

            const finished = response();
            finished.headersSent = true;
            finished.writableEnded = true;
            server.handler({}, finished);
            await flush();
            assert.equal(finished.status, null);
        } finally {
            f.cleanup();
        }
    }
);

test(
    "stop est idempotent et autorise start stop start",
    async () => {
        const f = fixture();
        try {
            assert.equal(
                await f.service.stop(),
                false
            );

            const first =
                f.service.start({});
            first.finishListen();
            assert.equal(
                await f.service.stop(),
                true
            );
            assert.equal(first.listening, false);
            assert.equal(f.service.server, null);
            assert.equal(
                await f.service.stop(),
                false
            );

            const second =
                f.service.start({});
            second.finishListen();
            assert.notEqual(first, second);
            assert.equal(f.servers.length, 2);
            assert.equal(second.listening, true);
            await f.service.stop();
        } finally {
            f.cleanup();
        }
    }
);

test(
    "un stop pendant listen ferme le serveur dès son établissement",
    async () => {
        const f = fixture();
        try {
            const server =
                f.service.start({});

            assert.equal(
                await f.service.stop(),
                false
            );
            assert.equal(f.service.stopRequested, true);

            server.finishListen();
            await flush();

            assert.equal(server.listening, false);
            assert.equal(server.closeCalls, 1);
            assert.equal(f.service.server, null);
            assert.equal(f.service.available, false);
        } finally {
            f.cleanup();
        }
    }
);
