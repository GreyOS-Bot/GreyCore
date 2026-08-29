const test =
    require("node:test");
const assert =
    require("node:assert/strict");
const path =
    require("node:path");
const Database =
    require("better-sqlite3");

const {
    stubModule
} = require("./helpers/moduleStub");

function loadManagerWithDatabase(
    database
) {
    stubModule(
        "src/database/database.js",
        database
    );

    for (
        const modulePath
        of [
            "src/v2/repositories/phone/PhoneCallRepository.js",
            "src/v2/managers/phoneCall/PhoneCallRepository.js",
            "src/v2/managers/phoneCall/PhoneCallReader.js",
            "src/v2/managers/phoneCall/PhoneCallCreationManager.js",
            "src/v2/managers/phoneCall/PhoneCallTransitionManager.js",
            "src/v2/managers/phoneCall/PhoneCallMessageManager.js",
            "src/v2/managers/PhoneCallV2Manager.js"
        ]
    ) {
        delete require.cache[
            require.resolve(
                path.resolve(modulePath)
            )
        ];
    }

    return require(
        "../src/v2/managers/PhoneCallV2Manager"
    );
}

function createPhoneCallDatabase() {
    const database =
        new Database(":memory:");

    database.exec(`
        CREATE TABLE ContinuityPhonesV2 (
            id INTEGER PRIMARY KEY,
            is_active INTEGER NOT NULL
        );

        CREATE TABLE PhoneCallsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caller_phone_id INTEGER NOT NULL,
            receiver_phone_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            answered_at TEXT,
            ended_at TEXT
        );

        CREATE TABLE PhoneCallMessagesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_id INTEGER NOT NULL,
            speaker_phone_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        INSERT INTO ContinuityPhonesV2 (id, is_active)
        VALUES (1, 1), (2, 1), (3, 1), (4, 1);
    `);

    return database;
}

test(
    "la reprise locale termine uniquement les appels antérieurs au démarrage",
    () => {
        const database =
            createPhoneCallDatabase();
        const manager =
            loadManagerWithDatabase(
                database
            );

        const startupCutoff =
            "2026-02-01T00:00:00.000Z";
        const recoveryAt =
            "2026-02-01T00:00:01.000Z";

        const insertCall =
            database.prepare(`
                INSERT INTO PhoneCallsV2 (
                    id,
                    caller_phone_id,
                    receiver_phone_id,
                    status,
                    created_at,
                    updated_at,
                    answered_at,
                    ended_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

        insertCall.run(
            10, 1, 2, "ringing",
            "2026-01-01T00:00:00.000Z",
            "2026-01-01T00:00:00.000Z",
            null, null
        );
        insertCall.run(
            11, 1, 2, "accepted",
            "2026-01-02T00:00:00.000Z",
            "2026-01-02T00:05:00.000Z",
            "2026-01-02T00:05:00.000Z",
            null
        );
        insertCall.run(
            12, 1, 2, "ended",
            "2026-01-03T00:00:00.000Z",
            "2026-01-03T00:10:00.000Z",
            "2026-01-03T00:05:00.000Z",
            "2026-01-03T00:10:00.000Z"
        );
        insertCall.run(
            13, 3, 4, "ringing",
            "2026-02-01T00:00:00.001Z",
            "2026-02-01T00:00:00.001Z",
            null, null
        );
        insertCall.run(
            14, 3, 4, "accepted",
            "2026-02-01T00:00:00.001Z",
            "2026-02-01T00:00:00.002Z",
            "2026-02-01T00:00:00.002Z",
            null
        );

        for (
            const [id, status]
            of [
                [15, "refused"],
                [16, "missed"],
                [17, "cancelled"]
            ]
        ) {
            insertCall.run(
                id, 1, 2, status,
                `2026-01-${id}T00:00:00.000Z`,
                `2026-01-${id}T00:10:00.000Z`,
                null,
                `2026-01-${id}T00:10:00.000Z`
            );
        }

        database.prepare(`
            INSERT INTO PhoneCallMessagesV2 (
                call_id,
                speaker_phone_id,
                content,
                created_at
            )
            VALUES (11, 1, 'Conversation conservée', ?)
        `).run(
            "2026-01-02T00:06:00.000Z"
        );

        const terminalBefore =
            database.prepare(`
                SELECT *
                FROM PhoneCallsV2
                WHERE id IN (12, 15, 16, 17)
                ORDER BY id
            `).all();

        const first =
            require(
                "../src/v2/managers/phoneCall/PhoneCallTransitionManager"
            ).reconcileInterruptedCalls(
                startupCutoff,
                recoveryAt
            );

        assert.deepEqual(
            first,
            {
                ringing: 1,
                accepted: 1
            }
        );

        const oldRinging =
            manager.getById(10);
        assert.equal(oldRinging.status, "missed");
        assert.equal(oldRinging.ended_at, recoveryAt);
        assert.equal(oldRinging.caller_phone_id, 1);
        assert.equal(oldRinging.receiver_phone_id, 2);

        const oldAccepted =
            manager.getById(11);
        assert.equal(oldAccepted.status, "ended");
        assert.equal(
            oldAccepted.answered_at,
            "2026-01-02T00:05:00.000Z"
        );
        assert.equal(oldAccepted.ended_at, recoveryAt);
        assert.deepEqual(
            database.prepare(`
                SELECT content
                FROM PhoneCallMessagesV2
                WHERE call_id = 11
            `).all(),
            [
                {
                    content:
                        "Conversation conservée"
                }
            ]
        );

        assert.equal(
            manager.getById(13).status,
            "ringing"
        );
        assert.equal(
            manager.getById(14).status,
            "accepted"
        );
        assert.deepEqual(
            database.prepare(`
                SELECT *
                FROM PhoneCallsV2
                WHERE id IN (12, 15, 16, 17)
                ORDER BY id
            `).all(),
            terminalBefore
        );

        const second =
            require(
                "../src/v2/managers/phoneCall/PhoneCallTransitionManager"
            ).reconcileInterruptedCalls(
                startupCutoff,
                "2026-02-01T00:00:02.000Z"
            );

        assert.deepEqual(
            second,
            {
                ringing: 0,
                accepted: 0
            }
        );
        assert.equal(
            manager.getById(13).status,
            "ringing"
        );
        assert.equal(
            manager.getById(14).status,
            "accepted"
        );

        assert.throws(
            () => manager.acceptCall(10),
            /ne peut plus être accepté/
        );
        assert.throws(
            () => manager.endCall(11),
            /Seul un appel en cours/
        );

        const newCall =
            manager.createCall({
                callerPhoneId: 1,
                receiverPhoneId: 2
            });

        assert.equal(newCall.status, "ringing");

        database.close();
    }
);

test(
    "le bootstrap réutilise un cutoff fixe et récupère avant les services",
    () => {
        const calls = [];
        const cutoffs = [];

        stubModule(
            "src/database/schema.js",
            {
                initializeDatabase:
                    () => calls.push("database")
            }
        );
        stubModule(
            "src/v2/managers/PhoneCallV2Manager.js",
            {
                reconcileInterruptedCalls:
                    cutoff => {
                        calls.push("recovery");
                        cutoffs.push(cutoff);
                        return {
                            ringing: 0,
                            accepted: 0
                        };
                    }
            }
        );
        stubModule(
            "src/database/DatabaseBackupService.js",
            {
                start:
                    () => calls.push("backup")
            }
        );
        stubModule(
            "src/v2/services/StaffErrorLogService.js",
            {
                initialize:
                    () => calls.push("staff")
            }
        );
        stubModule(
            "src/managers/RelationshipManager.js",
            {
                getRelationshipTypes:
                    () => []
            }
        );

        for (
            const modulePath
            of [
                "src/v2/services/scenes/SceneInactivityService.js",
                "src/v2/services/entities/NarrativeEntityEventScheduler.js",
                "src/v2/services/greyfate/GreyFateIntegrationService.js"
            ]
        ) {
            stubModule(
                modulePath,
                {
                    start:
                        () => calls.push("service")
                }
            );
        }

        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create:
                    () => ({
                        info:
                            () => calls.push("log")
                    })
            }
        );

        const readyPath =
            require.resolve(
                "../src/events/ready"
            );
        delete require.cache[readyPath];

        const ready =
            require(
                "../src/events/ready"
            );
        const client = {
            guilds: {
                cache:
                    new Map()
            },
            user: {
                tag: "Test"
            }
        };

        const originalLog =
            console.log;
        console.log = () => {};

        try {
            ready.execute(client);
            ready.execute(client);
        } finally {
            console.log = originalLog;
        }

        assert.deepEqual(
            calls.slice(0, 3),
            [
                "database",
                "recovery",
                "backup"
            ]
        );
        assert.equal(cutoffs.length, 2);
        assert.equal(cutoffs[0], cutoffs[1]);
    }
);

test(
    "les anciens boutons ne ressuscitent pas un appel récupéré",
    async () => {
        const effects = [];

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getCallById:
                    callId => ({
                        id: callId,
                        caller_phone_id: 1,
                        receiver_phone_id: 2,
                        status:
                            Number(callId) === 20
                                ? "missed"
                                : "ended"
                    }),
                getPhoneById:
                    phoneId => ({
                        id: phoneId
                    }),
                getContinuityByPhone:
                    phoneId => ({
                        id: `continuity-${phoneId}`,
                        character_id:
                            "character"
                    }),
                acceptCall:
                    () => effects.push("accept"),
                endCall:
                    () => effects.push("end"),
                cancelCall:
                    () => effects.push("cancel")
            }
        );
        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () => ({
                        id: "character",
                        discord_user_id: "user"
                    })
            }
        );
        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getPlayableDashboardData:
                    () => null
            }
        );
        stubModule(
            "src/v2/managers/PhoneCallSessionManager.js",
            {
                register:
                    () => effects.push("session"),
                get:
                    () => undefined
            }
        );
        stubModule(
            "src/v2/managers/PhoneCallUIManager.js",
            {
                refresh:
                    async () => effects.push("refresh")
            }
        );
        stubModule(
            "src/v2/services/phone/PhoneCallService.js",
            {
                finalizeCall:
                    async () => effects.push("discord")
            }
        );
        stubModule(
            "src/v2/managers/PhoneCallV2Manager.js",
            {}
        );
        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create:
                    () => ({
                        error:
                            () => {}
                    })
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                updateError:
                    async () => effects.push("error"),
                editOrReplyError:
                    async () => effects.push("speak-refused"),
                privatePayload:
                    value => value
            }
        );

        const actionPath =
            require.resolve(
                "../src/v2/pages/character/PhoneCallActionPage"
            );
        const modalPath =
            require.resolve(
                "../src/v2/modals/PhoneCallSpeakModal"
            );
        delete require.cache[actionPath];
        delete require.cache[modalPath];

        const actionPage =
            require(
                "../src/v2/pages/character/PhoneCallActionPage"
            );
        const speakModal =
            require(
                "../src/v2/modals/PhoneCallSpeakModal"
            );
        const interaction = {
            guildId: null,
            user: {
                id: "user"
            },
            deferUpdate:
                async () => effects.push("defer"),
            showModal:
                async () => effects.push("modal")
        };

        await actionPage.accept(
            interaction,
            20,
            "character"
        );
        await actionPage.end(
            interaction,
            21,
            "character"
        );
        await speakModal.show(
            interaction,
            21,
            "character"
        );

        assert.equal(
            effects.includes("accept"),
            false
        );
        assert.equal(
            effects.includes("end"),
            false
        );
        assert.equal(
            effects.includes("cancel"),
            false
        );
        assert.equal(
            effects.includes("discord"),
            false
        );
        assert.equal(
            effects.includes("session"),
            false
        );
        assert.equal(
            effects.includes("modal"),
            false
        );
        assert.equal(
            effects.includes("speak-refused"),
            true
        );
    }
);
