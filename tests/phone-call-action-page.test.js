const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "un destinataire peut accepter un appel depuis son message privé",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getPlayableDashboardData:
                    () => null
            }
        );

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () => ({
                        id: "receiver-character",
                        discord_user_id: "receiver-user"
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getCallById:
                    () => ({
                        id: 40,
                        caller_phone_id: 10,
                        receiver_phone_id: 20,
                        status: "ringing"
                    }),
                getPhoneById:
                    phoneId => ({ id: phoneId }),
                getContinuityByPhone:
                    () => ({
                        id: "receiver-continuity",
                        character_id:
                            "receiver-character"
                    }),
                acceptCall:
                    callId => ({
                        id: callId,
                        status: "accepted"
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneCallSessionManager.js",
            {
                register:
                    (
                        callId,
                        data
                    ) =>
                        calls.push([
                            "register",
                            callId,
                            data
                        ])
            }
        );

        stubModule(
            "src/v2/managers/PhoneCallUIManager.js",
            {
                refresh:
                    async callId =>
                        calls.push([
                            "refresh",
                            callId
                        ])
            }
        );

        stubModule(
            "src/v2/services/phone/PhoneCallService.js",
            {}
        );

        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create:
                    () => ({
                        error:
                            () => null
                    })
            }
        );

        const pagePath =
            require.resolve(
                "../src/v2/pages/character/PhoneCallActionPage"
            );

        delete require.cache[pagePath];

        const page =
            require(
                "../src/v2/pages/character/PhoneCallActionPage"
            );

        let deferred = false;

        const result =
            await page.accept(
                {
                    guildId: null,
                    user: {
                        id: "receiver-user"
                    },
                    message: {
                        id: "private-notification"
                    },
                    deferUpdate:
                        async () => {
                            deferred = true;
                        }
                },
                40,
                "receiver-character"
            );

        assert.equal(result.status, "accepted");
        assert.equal(deferred, true);
        assert.deepEqual(
            calls.map(call => call[0]),
            [
                "register",
                "refresh"
            ]
        );
    }
);
