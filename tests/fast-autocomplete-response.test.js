const test = require("node:test");
const assert = require("node:assert/strict");

const service = require(
    "../src/v2/core/services/FastAutocompleteResponseService"
);

test(
    "l’autocomplétion contourne la file REST utilisée par les proxies",
    async context => {
        const originalFetch = global.fetch;
        let request;
        let standardRespondCount = 0;

        context.after(() => {
            global.fetch = originalFetch;
        });
        global.fetch = async (
            url,
            options
        ) => {
            request = {
                url,
                options
            };

            return {
                ok: true,
                status: 204
            };
        };

        const interaction = {
            id: "interaction",
            token: "token",
            responded: false,
            respond: async () => {
                standardRespondCount += 1;
            }
        };
        const choices = [
            {
                name: "Reya — Morgane",
                value: "character"
            }
        ];

        await service.respond(
            interaction,
            choices
        );

        assert.equal(standardRespondCount, 0);
        assert.equal(interaction.responded, true);
        assert.equal(
            request.url,
            "https://discord.com/api/v10/interactions/interaction/token/callback"
        );
        assert.deepEqual(
            JSON.parse(request.options.body),
            {
                type: 8,
                data: {
                    choices
                }
            }
        );
    }
);

test("le service borne, déduplique et sécurise les choix sans modifier leurs valeurs", async context => {
    const originalFetch = global.fetch;
    let sentChoices;
    context.after(() => { global.fetch = originalFetch; });
    global.fetch = async (url, options) => {
        sentChoices = JSON.parse(options.body).data.choices;
        return { ok: true, status: 204 };
    };

    const choices = [
        { name: "Même nom", value: "first" },
        { name: "Même nom", value: "second" },
        { name: "Doublon", value: "first" },
        { name: "X".repeat(150), value: "stable-value" },
        { name: "Invalide", value: undefined },
        { name: "", value: "empty-name" },
        ...Array.from({ length: 30 }, (_, index) => ({
            name: `Choix ${index}`,
            value: `value-${index}`
        }))
    ];
    const interaction = { id: "normalize", token: "token", responded: false };

    await service.respond(interaction, choices);

    assert.equal(sentChoices.length, 25);
    assert.deepEqual(sentChoices.slice(0, 4), [
        { name: "Même nom", value: "first" },
        { name: "Même nom", value: "second" },
        { name: "X".repeat(100), value: "stable-value" },
        { name: "Choix 0", value: "value-0" }
    ]);
    assert.equal(sentChoices.filter(choice => choice.value === "first").length, 1);
});

test("une interaction déjà répondue ou deux appels simultanés ne produisent qu’un envoi", async context => {
    const originalFetch = global.fetch;
    let fetchCount = 0;
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    context.after(() => { global.fetch = originalFetch; });
    global.fetch = async () => {
        fetchCount += 1;
        await gate;
        return { ok: true, status: 204 };
    };

    const alreadyResponded = { id: "done", token: "token", responded: true };
    await service.respond(alreadyResponded, []);
    assert.equal(fetchCount, 0);

    const interaction = { id: "concurrent", token: "token", responded: false };
    const first = service.respond(interaction, [{ name: "A", value: "a" }]);
    const second = service.respond(interaction, [{ name: "B", value: "b" }]);
    release();
    await Promise.all([first, second]);
    assert.equal(fetchCount, 1);
});

test("l’absence d’id/token conserve le fallback Discord standard sans récursion", async () => {
    let received;
    const interaction = {
        responded: false,
        respond: async choices => { received = choices; }
    };
    await service.respond(interaction, [{ name: "Choix", value: "value" }]);
    assert.deepEqual(received, [{ name: "Choix", value: "value" }]);
    assert.equal(interaction.responded, true);
});

test("un non-2xx marque la tentative et interdit une seconde requête", async context => {
    const originalFetch = global.fetch;
    let fetchCount = 0;
    context.after(() => { global.fetch = originalFetch; });
    global.fetch = async () => {
        fetchCount += 1;
        return { ok: false, status: 400 };
    };
    const interaction = { id: "rejected", token: "token", responded: false };
    await assert.rejects(service.respond(interaction, []), /400/);
    await assert.rejects(service.respond(interaction, []), /400/);
    assert.equal(fetchCount, 1);
    assert.equal(service.hasAttempted(interaction), true);
});

test("le callback direct conserve le timeout de 2500 ms sans nouvelle tentative", async context => {
    const originalFetch = global.fetch;
    const originalTimeout = AbortSignal.timeout;
    let fetchCount = 0;
    let timeoutValue;
    context.after(() => {
        global.fetch = originalFetch;
        AbortSignal.timeout = originalTimeout;
    });
    AbortSignal.timeout = value => {
        timeoutValue = value;
        return originalTimeout(60_000);
    };
    global.fetch = async () => {
        fetchCount += 1;
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        throw error;
    };
    const interaction = { id: "timeout", token: "token", responded: false };
    await assert.rejects(service.respond(interaction, []), { name: "TimeoutError" });
    await assert.rejects(service.respond(interaction, []), { name: "TimeoutError" });
    assert.equal(timeoutValue, 2_500);
    assert.equal(fetchCount, 1);
});
