const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const guildCreate =
    require("../src/events/guildCreate");

function createTextChannel(
    sent
) {
    return {
        isTextBased: () => true,
        permissionsFor: () => ({
            has: () => true
        }),
        send: async payload => {
            sent.push(payload);
        }
    };
}

test(
    "l’arrivée du bot envoie le guide de démarrage dans un salon utilisable",
    async () => {
        const sent = [];
        const systemChannel =
            createTextChannel(sent);

        await guildCreate.execute({
            systemChannel,
            members: {
                me: {}
            },
            channels: {
                cache: new Map()
            }
        });

        assert.equal(
            sent.length,
            1
        );

        assert.match(
            sent[0].embeds[0]
                .toJSON()
                .title,
            /Bien démarrer/
        );

        assert.deepEqual(
            sent[0].allowedMentions,
            { parse: [] }
        );
    }
);
