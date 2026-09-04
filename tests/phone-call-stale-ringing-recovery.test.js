const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("un nouvel appel libère d'abord les appels sans réponse devenus obsolètes", () => {
    const calls = new Map([
        [7, {
            id: 7,
            caller_phone_id: 1,
            receiver_phone_id: 2,
            status: "ringing",
            created_at: "2000-01-01T00:00:00.000Z"
        }]
    ]);
    let nextId = 8;
    let expiration = null;

    stubModule("src/v2/managers/phoneCall/PhoneCallRepository.js", {
        getPhoneById: id => ({ id, is_active: 1 }),
        expireStaleRingingCalls: options => {
            expiration = options;
            for (const call of calls.values()) {
                if (
                    call.status === "ringing"
                    && call.created_at <= options.limitDate
                ) {
                    call.status = "missed";
                    call.ended_at = options.endedAt;
                }
            }
            return 1;
        },
        getActiveForPhone: phoneId =>
            [...calls.values()].find(call =>
                ["ringing", "accepted"].includes(call.status)
                && (
                    call.caller_phone_id === phoneId
                    || call.receiver_phone_id === phoneId
                )
            ) || null,
        insertCall: data => {
            const id = nextId++;
            calls.set(id, {
                id,
                caller_phone_id: data.callerPhoneId,
                receiver_phone_id: data.receiverPhoneId,
                status: "ringing",
                created_at: data.createdAt
            });
            return id;
        },
        getById: id => calls.get(Number(id))
    });

    const managerPath = require.resolve(
        "../src/v2/managers/phoneCall/PhoneCallCreationManager"
    );
    delete require.cache[managerPath];
    const manager = require(managerPath);
    const call = manager.createCall({
        callerPhoneId: 1,
        receiverPhoneId: 3
    });

    assert.equal(calls.get(7).status, "missed");
    assert.equal(call.status, "ringing");
    assert.equal(call.receiver_phone_id, 3);
    assert.ok(expiration);
    assert.equal(
        Date.parse(expiration.endedAt) - Date.parse(expiration.limitDate),
        12 * 60 * 60 * 1000
    );
});

test("un appel réellement en cours continue de bloquer un nouvel appel", () => {
    stubModule("src/v2/managers/phoneCall/PhoneCallRepository.js", {
        getPhoneById: id => ({ id, is_active: 1 }),
        expireStaleRingingCalls: () => 0,
        getActiveForPhone: phoneId => phoneId === 1
            ? { id: 9, status: "accepted" }
            : null
    });

    const managerPath = require.resolve(
        "../src/v2/managers/phoneCall/PhoneCallCreationManager"
    );
    delete require.cache[managerPath];
    const manager = require(managerPath);

    assert.throws(
        () => manager.createCall({
            callerPhoneId: 1,
            receiverPhoneId: 3
        }),
        /déjà en communication/
    );
});
