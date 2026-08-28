const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");
const { stubModule } = require("./helpers/moduleStub");

const servicePath = "../src/v2/services/greyfate/GreyFateIntegrationService";
const repositoryPath = "../src/v2/repositories/GreyFateRepository";

function clear(modulePath) {
    delete require.cache[require.resolve(modulePath)];
}

function stubServiceDependencies() {
    stubModule("src/v2/managers/NarrativeEntityV2Manager.js", { getByGuild: () => [] });
    stubModule("src/webhooks/webhookManager.js", {});
    stubModule("src/v2/core/services/DiscordThreadAccessService.js", {});
    stubModule("src/v2/core/services/DiscordReferenceResolverService.js", {});
    stubModule("src/v2/core/services/TechnicalLogger.js", {
        create: () => ({ info: () => {}, warn: () => {}, error: () => {} })
    });
}

function createFixture(context, occurrence = "2026-08-29T12:00:00.000Z") {
    const isolated = createIsolatedDatabase();
    context.after(() => isolated.cleanup());
    stubServiceDependencies();
    clear(repositoryPath);
    const repository = require(repositoryPath);
    repository.initializeSchema();
    isolated.database.prepare(`INSERT INTO GreyFateDuos(
        duo_id,event_id,guild_id,thread_id,male_user_id,female_user_id,
        status,closure_prompt_sent_at,updated_at
    ) VALUES ('duo','event','guild','thread','male','female','ACTIVE',?,?)`)
        .run(occurrence, occurrence);
    clear(servicePath);
    return {
        isolated,
        repository,
        service: require(servicePath),
        occurrence
    };
}

function response(body = {}) {
    return {
        ok: true,
        status: 200,
        json: async () => body
    };
}

test("le bouton CONTINUE encode exactement l'occurrence persistée", async () => {
    const occurrence = "2026-08-29T12:34:56.789Z";
    const marked = [];
    let sentComponents;
    stubServiceDependencies();
    stubModule("src/v2/repositories/GreyFateRepository.js", {
        getDuo: () => ({
            duo_id: "duo", guild_id: "guild", thread_id: "thread",
            closed_at: null, closure_prompt_sent_at: null
        }),
        markClosurePrompt: (duoId, value) => marked.push([duoId, value]),
        markError: () => {}
    });
    clear(servicePath);
    const service = require(servicePath);
    service.resolveDuoThread = async () => ({ id: "thread", guildId: "guild" });
    service.sendAsWeaver = async (channel, content, components) => {
        sentComponents = components;
        return { id: "message" };
    };
    const originalDate = Date;
    global.Date = class extends originalDate {
        constructor(...args) { super(...(args.length ? args : [occurrence])); }
    };
    try {
        await service.closureDue({ duoId: "duo" });
    } finally {
        global.Date = originalDate;
    }

    const customId = sentComponents[0].components[0].data.custom_id;
    const encoded = customId.split(":")[2];
    assert.equal(service.decodeOccurrence(encoded), occurrence);
    assert.deepEqual(marked, [["duo", occurrence]]);
    assert.ok(customId.length <= 100);
});

test("un ACK perdu puis un restart réutilisent strictement la même operationKey", async context => {
    const fixture = createFixture(context);
    const previousUrl = process.env.GREYFATE_CALLBACK_URL;
    const previousSecret = process.env.GREYFATE_SHARED_SECRET;
    const previousFetch = global.fetch;
    process.env.GREYFATE_CALLBACK_URL = "http://127.0.0.1/greyfate";
    process.env.GREYFATE_SHARED_SECRET = "secret";
    const keys = [];
    global.fetch = async (url, options) => {
        keys.push(JSON.parse(options.body).operationKey);
        throw new Error("ACK perdu");
    };
    try {
        const duo = fixture.repository.getDuo("duo");
        await assert.rejects(
            fixture.service.continueDuo(duo, "actor", fixture.occurrence),
            /ACK perdu/
        );
        assert.equal(fixture.repository.getDuo("duo").closure_prompt_sent_at, fixture.occurrence);

        clear(servicePath);
        const restarted = require(servicePath);
        global.fetch = async (url, options) => {
            keys.push(JSON.parse(options.body).operationKey);
            return response({ duplicate: true });
        };
        const result = await restarted.continueDuo(
            fixture.repository.getDuo("duo"), "actor", fixture.occurrence
        );
        assert.equal(result.completed, true);
        assert.equal(result.duplicate, true);
        assert.equal(keys[0], keys[1]);
        assert.equal(fixture.repository.getDuo("duo").closure_prompt_sent_at, null);
    } finally {
        global.fetch = previousFetch;
        process.env.GREYFATE_CALLBACK_URL = previousUrl;
        process.env.GREYFATE_SHARED_SECRET = previousSecret;
    }
});

test("deux clics simultanés utilisent la même clé et un seul gagne localement", async context => {
    const fixture = createFixture(context);
    const previousUrl = process.env.GREYFATE_CALLBACK_URL;
    const previousSecret = process.env.GREYFATE_SHARED_SECRET;
    const previousFetch = global.fetch;
    process.env.GREYFATE_CALLBACK_URL = "http://127.0.0.1/greyfate";
    process.env.GREYFATE_SHARED_SECRET = "secret";
    const keys = [];
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    global.fetch = async (url, options) => {
        keys.push(JSON.parse(options.body).operationKey);
        await gate;
        return response();
    };
    try {
        const duo = fixture.repository.getDuo("duo");
        const first = fixture.service.continueDuo(duo, "actor-1", fixture.occurrence);
        const second = fixture.service.continueDuo(duo, "actor-2", fixture.occurrence);
        await new Promise(resolve => setImmediate(resolve));
        release();
        const results = await Promise.all([first, second]);

        assert.equal(keys.length, 2);
        assert.equal(keys[0], keys[1]);
        assert.deepEqual(results.map(result => result.completed).sort(), [false, true]);
        assert.equal(fixture.repository.getDuo("duo").closure_prompt_sent_at, null);
    } finally {
        global.fetch = previousFetch;
        process.env.GREYFATE_CALLBACK_URL = previousUrl;
        process.env.GREYFATE_SHARED_SECRET = previousSecret;
    }
});

test("une nouvelle occurrence reçoit une nouvelle clé et un ancien bouton est refusé", async context => {
    const fixture = createFixture(context);
    const previousUrl = process.env.GREYFATE_CALLBACK_URL;
    const previousSecret = process.env.GREYFATE_SHARED_SECRET;
    const previousFetch = global.fetch;
    process.env.GREYFATE_CALLBACK_URL = "http://127.0.0.1/greyfate";
    process.env.GREYFATE_SHARED_SECRET = "secret";
    const keys = [];
    global.fetch = async (url, options) => {
        keys.push(JSON.parse(options.body).operationKey);
        return response();
    };
    try {
        await fixture.service.continueDuo(
            fixture.repository.getDuo("duo"), "actor", fixture.occurrence
        );
        const secondOccurrence = "2026-08-31T12:00:00.000Z";
        fixture.isolated.database.prepare(`UPDATE GreyFateDuos
            SET closure_prompt_sent_at=? WHERE duo_id='duo'`).run(secondOccurrence);

        await assert.rejects(
            fixture.service.continueDuo(
                fixture.repository.getDuo("duo"), "actor", fixture.occurrence
            ),
            /n’est plus active/
        );
        assert.equal(keys.length, 1, "l'ancien bouton ne déclenche aucun HTTP");

        await fixture.service.continueDuo(
            fixture.repository.getDuo("duo"), "actor", secondOccurrence
        );
        assert.equal(keys.length, 2);
        assert.notEqual(keys[0], keys[1]);
    } finally {
        global.fetch = previousFetch;
        process.env.GREYFATE_CALLBACK_URL = previousUrl;
        process.env.GREYFATE_SHARED_SECRET = previousSecret;
    }
});

test("le routeur réserve les trois effets Discord au seul gagnant et refuse les boutons legacy", async () => {
    const occurrence = "2026-08-29T12:00:00.000Z";
    const encoded = Buffer.from(occurrence).toString("base64url");
    const effects = [];
    let completed = false;
    const duo = {
        duo_id: "duo", guild_id: "guild", thread_id: "thread",
        male_user_id: "user", female_user_id: "other",
        closure_prompt_sent_at: occurrence, closed_at: null
    };
    stubModule("src/v2/services/greyfate/GreyFateIntegrationService.js", {
        enabled: () => true,
        duo: () => duo,
        decodeOccurrence: value => value === encoded ? occurrence : null,
        continueDuo: async () => ({ completed }),
        sendAsWeaver: async () => effects.push("public-confirmation")
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyPrivate: async (interaction, message) => effects.push(["private", message])
    });
    clear("../src/v2/router/buttons/GreyFateRouter");
    const router = require("../src/v2/router/buttons/GreyFateRouter");
    const interaction = customId => ({
        customId,
        guildId: "guild",
        channelId: "thread",
        channel: { id: "thread" },
        user: { id: "user" },
        memberPermissions: { has: () => false },
        isButton: () => true,
        deferUpdate: async () => effects.push("defer"),
        editReply: async () => effects.push("components-removed")
    });

    await router(interaction(`greyfate_duo_continue:duo:${encoded}`));
    assert.deepEqual(effects, [
        "defer",
        ["private", "Cette proposition de prolongation a déjà été traitée."]
    ]);

    effects.length = 0;
    completed = true;
    await router(interaction(`greyfate_duo_continue:duo:${encoded}`));
    assert.deepEqual(effects, [
        "defer",
        "components-removed",
        "public-confirmation",
        ["private", "▶️ Scène prolongée."]
    ]);

    effects.length = 0;
    await router(interaction("greyfate_duo_continue:duo"));
    assert.equal(effects.includes("components-removed"), false);
    assert.equal(effects.includes("public-confirmation"), false);
    assert.match(effects.at(-1)[1], /ancienne version/);
});

test("START et CLOSE conservent leurs clés stables", async () => {
    const keys = [];
    stubServiceDependencies();
    stubModule("src/v2/repositories/GreyFateRepository.js", {
        markStarted: () => {},
        markClosed: () => {}
    });
    clear(servicePath);
    const service = require(servicePath);
    service.sendToFate = async payload => keys.push(payload.operationKey);
    const duo = {
        duo_id: "duo", event_id: "event", guild_id: "guild", thread_id: "thread",
        scene_started_at: null
    };

    await service.sceneStart(duo, "actor");
    await service.closeDuo(duo, "actor");
    assert.deepEqual(keys, ["event:duo:START", "event:duo:CLOSE"]);
});
