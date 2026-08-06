const test = require("node:test");
const assert = require("node:assert/strict");

const service = require(
    "../src/v2/core/services/FastInteractionAcknowledgementService"
);

test(
    "une commande privée confirme directement l'interaction Discord",
    async context => {
        const originalFetch = global.fetch;
        const calls = [];

        context.after(() => {
            global.fetch = originalFetch;
        });

        global.fetch = async (url, options) => {
            calls.push({ url, options });
            return { ok: true };
        };

        const interaction = {
            id: "interaction-id",
            token: "interaction-token",
            deferred: false,
            replied: false,
            deferReply: async () => {
                throw new Error(
                    "La file REST discord.js ne doit pas être utilisée."
                );
            }
        };

        await service.deferReply(
            interaction,
            { ephemeral: true }
        );

        assert.equal(calls.length, 1);
        assert.deepEqual(
            JSON.parse(calls[0].options.body),
            {
                type: 5,
                data: { flags: 64 }
            }
        );
        assert.equal(interaction.deferred, true);
        assert.equal(interaction.ephemeral, true);
    }
);
