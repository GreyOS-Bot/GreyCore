const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");

const {
    GracefulShutdownService
} = require(
    "../src/v2/core/services/GracefulShutdownService"
);

function fixture(overrides = {}) {
    const calls = [];
    const logs = [];
    const timers = [];
    const cancelled = [];
    const processObject =
        overrides.processObject
        || Object.assign(
            new EventEmitter(),
            {
                exitCode: undefined,
                exit: code =>
                    calls.push(["exit", code])
            }
        );

    const dependencies = {
        greyFateService: {
            stop: async () =>
                calls.push("greyfate")
        },
        sceneInactivityService: {
            stop: () =>
                calls.push("scenes")
        },
        narrativeEntityScheduler: {
            stop: () =>
                calls.push("entities")
        },
        databaseBackupService: {
            stop: () =>
                calls.push("backup"),
            pendingBackup: null
        },
        getProductProjectionPublisher:
            () => ({
                stop: () =>
                    calls.push("publisher")
            }),
        client: {
            destroy: () =>
                calls.push("discord")
        },
        database: {
            open: true,
            close: () =>
                calls.push("database")
        },
        processObject,
        log: {
            error: (...values) =>
                logs.push(values)
        },
        scheduleTimeout: callback => {
            const timer = {
                callback,
                unref() {}
            };
            timers.push(timer);
            return timer;
        },
        cancelTimeout: timer =>
            cancelled.push(timer),
        forceExit: code =>
            calls.push(["exit", code]),
        ...overrides
    };

    return {
        service:
            new GracefulShutdownService(
                dependencies
            ),
        dependencies,
        processObject,
        calls,
        logs,
        timers,
        cancelled
    };
}

test(
    "le shutdown nominal ferme chaque ressource une fois et SQLite en dernier",
    async () => {
        const f = fixture();

        const first = f.service.shutdown();
        const second = f.service.shutdown();

        assert.equal(first, second);
        await first;

        assert.deepEqual(
            f.calls,
            [
                "greyfate",
                "scenes",
                "entities",
                "backup",
                "publisher",
                "discord",
                "database"
            ]
        );
        assert.equal(f.timers.length, 1);
        assert.deepEqual(
            f.cancelled,
            f.timers
        );
    }
);

test(
    "une erreur de stop ne bloque ni Discord ni la fermeture finale de SQLite",
    async () => {
        const f = fixture({
            greyFateService: {
                stop: () => {
                    throw new Error(
                        "Bearer SECRET C:\\Greycore\\server.js"
                    );
                }
            },
            sceneInactivityService: {
                stop: () =>
                    f.calls.push("scenes")
            }
        });

        await f.service.shutdown();

        assert.equal(
            f.calls.includes("discord"),
            true
        );
        assert.equal(
            f.calls.at(-1),
            "database"
        );
        const serialized =
            JSON.stringify(f.logs);
        assert.doesNotMatch(serialized, /SECRET/);
        assert.doesNotMatch(
            serialized,
            /C:\\\\Greycore/
        );
    }
);

test(
    "le shutdown attend la sauvegarde déjà en cours avant de fermer SQLite",
    async () => {
        let release;
        const pendingBackup =
            new Promise(
                resolve => {
                    release = resolve;
                }
            );
        const f = fixture();
        f.dependencies.databaseBackupService
            .pendingBackup = pendingBackup;

        const shutdown =
            f.service.shutdown();
        await new Promise(
            resolve => setImmediate(resolve)
        );

        assert.equal(
            f.calls.includes("discord"),
            false
        );
        assert.equal(
            f.calls.includes("database"),
            false
        );

        release();
        await shutdown;
        assert.equal(
            f.calls.at(-1),
            "database"
        );
    }
);

test(
    "les handlers SIGINT et SIGTERM sont installés une fois et partagent le shutdown",
    async () => {
        const f = fixture();

        f.service.installProcessHandlers();
        f.service.installProcessHandlers();

        assert.equal(
            f.processObject.listenerCount("SIGINT"),
            1
        );
        assert.equal(
            f.processObject.listenerCount("SIGTERM"),
            1
        );

        f.processObject.emit("SIGTERM");
        f.processObject.emit("SIGINT");
        await f.service.shutdownPromise;

        assert.equal(
            f.calls.filter(
                value => value === "greyfate"
            ).length,
            1
        );
        assert.equal(
            f.calls.filter(
                value => value === "database"
            ).length,
            1
        );
    }
);

test(
    "uncaughtException et une rejection non Error imposent exitCode 1 et un log sûr",
    async () => {
        for (const [event, reason] of [
            [
                "uncaughtException",
                new Error(
                    "https://discord.com/api/webhooks/1/TOKEN Bearer SECRET C:\\Greycore\\src\\index.js"
                )
            ],
            [
                "unhandledRejection",
                {
                    reason:
                        "Authorization: Bearer SECRET"
                }
            ]
        ]) {
            const f = fixture();
            f.service.installProcessHandlers();

            f.processObject.emit(
                event,
                reason
            );
            await f.service.shutdownPromise;

            assert.equal(
                f.processObject.exitCode,
                1
            );
            assert.equal(
                f.calls.at(-1),
                "database"
            );
            const serialized =
                JSON.stringify(f.logs);
            assert.doesNotMatch(
                serialized,
                /TOKEN|SECRET|C:\\\\Greycore/
            );
        }
    }
);

test(
    "un logger défaillant ne casse pas le shutdown fatal",
    async () => {
        const originalError =
            console.error;
        console.error = () => {};

        try {
            const f = fixture({
                log: {
                    error: () => {
                        throw new Error(
                            "logger failed"
                        );
                    }
                }
            });
            f.service.installProcessHandlers();

            assert.doesNotThrow(
                () => f.processObject.emit(
                    "uncaughtException",
                    new Error("fatal")
                )
            );
            await f.service.shutdownPromise;
            assert.equal(
                f.calls.at(-1),
                "database"
            );
        } finally {
            console.error = originalError;
        }
    }
);

test(
    "le timeout de sécurité force une sortie en échec sans tuer le runner",
    async () => {
        const never = new Promise(() => {});
        const f = fixture({
            greyFateService: {
                stop: () => never
            }
        });

        void f.service.shutdown();
        assert.equal(f.timers.length, 1);

        f.timers[0].callback();

        assert.equal(
            f.processObject.exitCode,
            1
        );
        assert.deepEqual(
            f.calls,
            [
                ["exit", 1]
            ]
        );
    }
);
