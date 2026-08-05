const test = require("node:test");
const assert = require("node:assert/strict");

test(
    "la confirmation rapide contourne la file REST générale",
    async context => {
        const originalFetch = global.fetch;
        const calls = [];

        context.after(() => {
            global.fetch = originalFetch;
        });

        global.fetch = async (
            url,
            options
        ) => {
            calls.push([
                url,
                options
            ]);

            return {
                ok: true,
                status: 204,
                text: async () => ""
            };
        };

        const servicePath = require.resolve(
            "../src/v2/core/services/FastInteractionAcknowledgementService"
        );
        delete require.cache[servicePath];
        const service = require(servicePath);

        let discordJsDefers = 0;
        const interaction = {
            id: "interaction-id",
            token: "interaction-token",
            deferred: false,
            replied: false,
            deferUpdate: async () => {
                discordJsDefers += 1;
            }
        };

        await service.deferComponentUpdate(
            interaction
        );

        assert.equal(discordJsDefers, 0);
        assert.equal(interaction.deferred, true);
        assert.match(
            calls[0][0],
            /interactions\/interaction-id\/interaction-token\/callback$/
        );
        assert.deepEqual(
            JSON.parse(calls[0][1].body),
            { type: 6 }
        );
    }
);

test(
    "une interaction partielle conserve le mécanisme discord.js",
    async () => {
        let defers = 0;
        const servicePath = require.resolve(
            "../src/v2/core/services/FastInteractionAcknowledgementService"
        );
        delete require.cache[servicePath];
        const service = require(servicePath);

        await service.deferComponentUpdate({
            deferred: false,
            replied: false,
            deferUpdate: async () => {
                defers += 1;
            }
        });

        assert.equal(defers, 1);
    }
);
