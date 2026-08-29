const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

function loadService(logs = []) {
    stubModule(
        "src/v2/managers/SceneAssistantV2Manager.js",
        {
            getInactiveScenes: () => []
        }
    );
    stubModule(
        "src/v2/services/scenes/SceneAssistantService.js",
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
                warn: (...values) =>
                    logs.push(["warn", ...values]),
                error: (...values) =>
                    logs.push(["error", ...values])
            })
        }
    );

    const servicePath =
        require.resolve(
            "../src/v2/services/scenes/SceneInactivityService"
        );
    delete require.cache[servicePath];

    return require(servicePath);
}

test(
    "le lifecycle Scènes installe un seul cycle et stop reste idempotent",
    () => {
        const originalTimeout = global.setTimeout;
        const originalInterval = global.setInterval;
        const originalClearTimeout = global.clearTimeout;
        const originalClearInterval = global.clearInterval;
        const timeouts = [];
        const intervals = [];
        const cleared = [];

        global.setTimeout = callback => {
            const timer = {
                callback,
                unref() {}
            };
            timeouts.push(timer);
            return timer;
        };
        global.setInterval = callback => {
            const timer = {
                callback,
                unref() {}
            };
            intervals.push(timer);
            return timer;
        };
        global.clearTimeout = timer =>
            cleared.push(["timeout", timer]);
        global.clearInterval = timer =>
            cleared.push(["interval", timer]);

        try {
            const service = loadService();

            service.start({ id: "client" });
            service.start({ id: "same-client" });

            assert.equal(timeouts.length, 1);
            assert.equal(intervals.length, 1);

            service.stop();
            service.stop();

            assert.deepEqual(
                cleared.map(value => value[0]),
                ["timeout", "interval"]
            );
            assert.equal(service.startupTimer, null);
            assert.equal(service.intervalTimer, null);

            service.start({ id: "restart" });
            assert.equal(timeouts.length, 2);
            assert.equal(intervals.length, 2);
            service.stop();
        } finally {
            global.setTimeout = originalTimeout;
            global.setInterval = originalInterval;
            global.clearTimeout = originalClearTimeout;
            global.clearInterval = originalClearInterval;
        }
    }
);

test(
    "un balayage lent ignore le tick concurrent puis libère toujours la garde",
    async () => {
        const logs = [];
        const service = loadService(logs);
        let calls = 0;
        let release;

        service.check = async () => {
            calls += 1;
            await new Promise(
                resolve => {
                    release = resolve;
                }
            );
            return ["prompt"];
        };

        const first = service.runOnceSafely();
        const overlap =
            await service.runOnceSafely();

        assert.deepEqual(overlap, []);
        assert.equal(calls, 1);
        assert.equal(service.running, true);

        release();
        assert.deepEqual(await first, ["prompt"]);
        assert.equal(service.running, false);

        service.check = async () => {
            calls += 1;
            throw new Error("échec initial");
        };

        assert.deepEqual(
            await service.runOnceSafely(),
            []
        );
        assert.equal(service.running, false);
        assert.equal(logs.length, 1);
        assert.match(logs[0][2], /échec initial/);

        service.check = async () => {
            calls += 1;
            return ["next"];
        };

        assert.deepEqual(
            await service.runOnceSafely(),
            ["next"]
        );
        assert.equal(calls, 3);
    }
);

test(
    "une scène en erreur ne bloque pas les scènes suivantes",
    async () => {
        const logs = [];
        const saved = [];

        stubModule(
            "src/v2/managers/SceneAssistantV2Manager.js",
            {
                getInactiveScenes: () => [
                    {
                        id: "broken",
                        guild_id: "guild",
                        channel_id: "broken",
                        inactivity_hours: 48
                    },
                    {
                        id: "healthy",
                        guild_id: "guild",
                        channel_id: "healthy",
                        inactivity_hours: 48
                    }
                ],
                saveClosurePrompt: data =>
                    saved.push(data)
            }
        );
        stubModule(
            "src/v2/services/scenes/SceneAssistantService.js",
            {
                buildClosurePrompt: scene =>
                    scene.id
            }
        );
        stubModule(
            "src/v2/core/services/DiscordReferenceResolverService.js",
            {
                resolve: async reference => {
                    if (reference.discordId === "broken") {
                        throw new Error("canal cassé");
                    }
                    return {
                        available: true,
                        channel: {
                            isTextBased: () => true,
                            send: async () => ({
                                id: "prompt"
                            })
                        }
                    };
                }
            }
        );
        stubModule(
            "src/v2/core/services/DiscordThreadAccessService.js",
            {
                ensureWritable: async channel => ({
                    ready: true,
                    channel
                })
            }
        );
        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create: () => ({
                    warn: () => {},
                    error: (...values) =>
                        logs.push(values)
                })
            }
        );

        const servicePath =
            require.resolve(
                "../src/v2/services/scenes/SceneInactivityService"
            );
        delete require.cache[servicePath];
        const service = require(servicePath);
        service.client = {};

        assert.deepEqual(
            await service.check(),
            ["healthy"]
        );
        assert.equal(saved.length, 1);
        assert.equal(logs.length, 1);
    }
);
