const test = require("node:test");
const assert = require("node:assert/strict");

const service = require(
    "../src/v2/core/services/OriginalMessageDeletionService"
);

test(
    "une erreur Discord temporaire déclenche une suppression directe de secours",
    async context => {
        const originalFetch = global.fetch;
        const requests = [];

        context.after(() => {
            global.fetch = originalFetch;
        });

        global.fetch = async (
            url,
            options
        ) => {
            requests.push({
                url,
                options
            });

            return {
                ok: true,
                status: 204
            };
        };

        await service.delete({
            id: "message",
            channel: {
                id: "channel"
            },
            client: {
                token: "secret"
            },
            delete: async () => {
                const error = new Error(
                    "Gateway timeout"
                );
                error.status = 504;
                throw error;
            }
        });

        assert.equal(requests.length, 1);
        assert.equal(
            requests[0].url,
            "https://discord.com/api/v10/channels/channel/messages/message"
        );
        assert.equal(
            requests[0].options.method,
            "DELETE"
        );
        assert.equal(
            requests[0].options.headers.authorization,
            "Bot secret"
        );
    }
);

test(
    "une permission manquante ne déclenche pas de requêtes répétées",
    async context => {
        const originalFetch = global.fetch;
        let fetchCount = 0;

        context.after(() => {
            global.fetch = originalFetch;
        });

        global.fetch = async () => {
            fetchCount += 1;
        };

        const error = new Error(
            "Missing permissions"
        );
        error.code = 50013;

        await assert.rejects(
            service.delete({
                client: {
                    token: "secret"
                },
                delete: async () => {
                    throw error;
                }
            }),
            candidate => candidate === error
        );

        assert.equal(fetchCount, 0);
    }
);
