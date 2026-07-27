const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase,
    withMutedConsole
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "la migration ajoute updated_at aux anciens appels et les transitions restent possibles",
    async () => {
        const isolated =
            createIsolatedDatabase();

        try {
            isolated.database.exec(`
                CREATE TABLE PhoneCallsV2 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    caller_phone_id INTEGER NOT NULL,
                    receiver_phone_id INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    answered_at TEXT,
                    ended_at TEXT
                );

                INSERT INTO PhoneCallsV2 (
                    caller_phone_id,
                    receiver_phone_id,
                    status,
                    created_at
                )
                VALUES (1, 2, 'ringing', '2026-07-27T00:00:00.000Z');
            `);

            const schemaPath =
                require.resolve(
                    "../src/database/schemaV2Roleplay"
                );

            delete require.cache[schemaPath];

            await withMutedConsole(
                () =>
                    require(
                        "../src/database/schemaV2Roleplay"
                    )()
            );

            const columns =
                isolated.database
                    .prepare(
                        "PRAGMA table_info(PhoneCallsV2)"
                    )
                    .all()
                    .map(
                        column =>
                            column.name
                    );

            assert.ok(
                columns.includes("updated_at")
            );

            const repositoryPath =
                require.resolve(
                    "../src/v2/repositories/phone/PhoneCallRepository"
                );

            delete require.cache[repositoryPath];

            const repository =
                require(
                    "../src/v2/repositories/phone/PhoneCallRepository"
                );

            assert.equal(
                repository.transitionCall({
                    callId: 1,
                    expectedStatus: "ringing",
                    nextStatus: "missed",
                    occurredAt:
                        "2026-07-27T00:01:00.000Z",
                    timestampField: "ended_at",
                    updateTimestamp: true
                }),
                1
            );

            const call =
                isolated.database
                    .prepare(
                        "SELECT * FROM PhoneCallsV2 WHERE id = 1"
                    )
                    .get();

            assert.equal(call.status, "missed");
            assert.equal(
                call.updated_at,
                "2026-07-27T00:01:00.000Z"
            );
        } finally {
            isolated.cleanup();
        }
    }
);
