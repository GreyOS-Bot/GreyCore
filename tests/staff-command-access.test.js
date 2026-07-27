const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

const servicePath =
    require.resolve(
        "../src/v2/core/services/StaffCommandAccessService"
    );

function loadService(canManageServerTools) {
    stubModule(
        "src/v2/core/policies/ValidationStaffPolicy.js",
        {
            canManageServerTools
        }
    );

    delete require.cache[servicePath];

    return require(
        "../src/v2/core/services/StaffCommandAccessService"
    );
}

test(
    "les commandes staff acceptent l’accès au salon de validation et refusent les autres membres",
    async () => {
        let reply;

        const deniedService =
            loadService(() => false);

        const denied =
            await deniedService
                .requireStaffCommandAccess({
                    guildId: "guild",
                    inGuild: () => true,
                    reply: async payload => {
                        reply = payload;
                    }
                });

        assert.equal(denied, false);
        assert.match(
            reply.content,
            /réservée au staff/
        );

        const allowedService =
            loadService(() => true);

        const allowed =
            await allowedService
                .requireStaffCommandAccess({});

        assert.equal(allowed, true);
    }
);
