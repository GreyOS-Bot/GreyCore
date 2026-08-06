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
