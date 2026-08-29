const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

const routerPath = require.resolve("../src/v2/router/autocompleteRouter");

function interaction(command) {
    return {
        commandName: "test",
        guildId: "guild",
        responded: false,
        isAutocomplete: () => true,
        client: { commands: new Map(command ? [["test", command]] : []) }
    };
}

function loadRouter({ responseService, report }) {
    stubModule("src/v2/core/services/FastAutocompleteResponseService.js", responseService);
    stubModule("src/v2/services/StaffErrorLogService.js", { report });
    delete require.cache[routerPath];
    return require(routerPath);
}

test("un handler réussi répond normalement par le service central", async () => {
    const calls = [];
    const attempted = new WeakSet();
    const router = loadRouter({
        responseService: {
            hasAttempted: value => attempted.has(value),
            respond: async (value, choices) => {
                attempted.add(value);
                calls.push(choices);
                value.responded = true;
            }
        },
        report: async () => { throw new Error("ne doit pas être appelé"); }
    });
    const current = interaction({ autocomplete: async value => value.respond([{ name: "A", value: "a" }]) });
    assert.equal(await router(current), true);
    assert.deepEqual(calls, [[{ name: "A", value: "a" }]]);
});

test("une erreur avant respond lance le fallback vide avant le journal staff lent", async () => {
    const order = [];
    let releaseReport;
    const reportGate = new Promise(resolve => { releaseReport = resolve; });
    const attempted = new WeakSet();
    const router = loadRouter({
        responseService: {
            hasAttempted: value => attempted.has(value),
            respond: async (value, choices) => {
                attempted.add(value);
                order.push(`respond:${choices.length}`);
                value.responded = true;
            }
        },
        report: async () => {
            order.push("report:start");
            await reportGate;
            order.push("report:end");
        }
    });
    const current = interaction({ autocomplete: async () => { throw new Error("handler failed"); } });
    assert.equal(await router(current), true);
    assert.deepEqual(order, ["respond:0", "report:start"]);
    releaseReport();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(order, ["respond:0", "report:start", "report:end"]);
});

test("un transport déjà tenté et échoué ne déclenche aucune seconde réponse", async () => {
    let responseCount = 0;
    const attempted = new WeakSet();
    const router = loadRouter({
        responseService: {
            hasAttempted: value => attempted.has(value),
            respond: async value => {
                responseCount += 1;
                attempted.add(value);
                throw new Error("transport failed");
            }
        },
        report: async () => { throw new Error("journal failed"); }
    });
    const current = interaction({ autocomplete: async value => value.respond([]) });
    assert.equal(await router(current), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(responseCount, 1);
});

test("une commande sans autocomplete reçoit immédiatement une liste vide", async () => {
    const calls = [];
    const router = loadRouter({
        responseService: {
            hasAttempted: () => false,
            respond: async (value, choices) => {
                calls.push(choices);
                value.responded = true;
            }
        },
        report: async () => false
    });
    assert.equal(await router(interaction({})), true);
    assert.deepEqual(calls, [[]]);
});

test("la maintenance conserve une réponse autocomplete vide", async () => {
    const calls = [];
    stubModule("src/v2/managers/GuildSettingsV2Manager.js", {
        getMaintenance: () => ({ enabled: true, message: "Maintenance" })
    });
    stubModule("src/v2/core/services/FastAutocompleteResponseService.js", {
        respond: async (value, choices) => { calls.push(choices); value.responded = true; }
    });
    const maintenancePath = require.resolve("../src/v2/services/MaintenanceModeService");
    delete require.cache[maintenancePath];
    const service = require(maintenancePath);
    const current = interaction({});
    assert.equal(await service.blockInteraction(current), true);
    assert.deepEqual(calls, [[]]);
});
