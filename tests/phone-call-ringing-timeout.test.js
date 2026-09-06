const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
    stubModule
} = require("./helpers/moduleStub");

function loadStartPage({
    currentStatus = "ringing",
    notificationFails = false
} = {}) {
    const effects = [];
    let timeoutCallback = null;
    let timeoutDelay = null;
    const timeoutHandle = { id: "timeout" };

    stubModule(
        "src/v2/core/services/TechnicalLogger.js",
        {
            create:
                () => ({
                    error:
                        (...args) => effects.push([
                            "error",
                            ...args
                        ])
                })
        }
    );
    stubModule(
        "src/v2/managers/PhoneV2Manager.js",
        {
            getPhoneByContinuity:
                () => ({ id: 1 }),
            getConversationById:
                () => ({
                    id: 10,
                    conversation_type: "private"
                }),
            getActiveCall:
                () => null,
            createCall:
                () => ({
                    id: 20,
                    status: "ringing"
                }),
            getCallById:
                () => ({
                    id: 20,
                    status: currentStatus
                }),
            markMissed:
                callId => {
                    effects.push(["missed", callId]);
                    return {
                        id: callId,
                        status: "missed"
                    };
                }
        }
    );
    stubModule(
        "src/v2/managers/PhoneConversationV2Manager.js",
        {
            isParticipant:
                () => true,
            getOtherParticipant:
                () => ({
                    phone_id: 2,
                    continuity_id: 2,
                    character_id: "receiver",
                    character_name: "Receiver"
                })
        }
    );
    stubModule(
        "src/v2/managers/PhoneCallSessionManager.js",
        {
            register:
                () => effects.push(["register"]),
            setTimeout:
                (callId, handle) => effects.push([
                    "timer",
                    callId,
                    handle
                ]),
            remove:
                callId => effects.push(["remove", callId])
        }
    );
    stubModule(
        "src/v2/managers/PhoneCallUIManager.js",
        {
            refresh:
                async callId => effects.push([
                    "refresh",
                    callId
                ])
        }
    );
    stubModule(
        "src/v2/services/dashboard/CharacterDashboardManager.js",
        {
            getPlayableDashboardData:
                () => ({
                    character: {
                        id: "caller",
                        discord_user_id: "user"
                    },
                    continuity: {
                        id: 1
                    }
                })
        }
    );
    stubModule(
        "src/v2/pages/character/CharacterPhoneCallPage.js",
        {
            execute:
                async () => ({ ok: true })
        }
    );
    stubModule(
        "src/v2/services/phone/PhoneNotificationService.js",
        {
            notifyIncomingCall:
                async () => {
                    effects.push(["notification"]);
                    if (notificationFails) {
                        throw new Error("DM unavailable");
                    }
                    return null;
                }
        }
    );
    stubModule(
        "src/v2/managers/InstallationV2Manager.js",
        {
            getByContinuityAndGuild:
                () => ({ status: "active" })
        }
    );
    stubModule(
        "src/v2/core/policies/InstallationAccessPolicy.js",
        {
            isPlayable:
                () => true
        }
    );
    stubModule(
        "src/v2/core/services/PublicErrorMessageService.js",
        {
            toPublicErrorMessage:
                error => error.message,
            PHONE_CALL_MESSAGES: {}
        }
    );

    const originalSetTimeout =
        global.setTimeout;
    global.setTimeout =
        (callback, delay) => {
            effects.push(["schedule"]);
            timeoutCallback = callback;
            timeoutDelay = delay;
            return timeoutHandle;
        };

    const pagePath =
        require.resolve(
            path.resolve(
                "src/v2/pages/character/PhoneCallStartPage.js"
            )
        );
    delete require.cache[pagePath];
    const page = require(pagePath);

    return {
        page,
        effects,
        timeoutHandle,
        getTimeoutCallback:
            () => timeoutCallback,
        getTimeoutDelay:
            () => timeoutDelay,
        restore:
            () => {
                global.setTimeout =
                    originalSetTimeout;
            }
    };
}

function interaction() {
    return {
        guildId: "guild",
        channelId: "channel",
        client: {},
        user: {
            id: "user"
        }
    };
}

test(
    "un appel ringing devient missed après douze heures",
    async () => {
        const context = loadStartPage();

        try {
            await context.page.execute(
                interaction(),
                10,
                "caller"
            );
        } finally {
            context.restore();
        }

        assert.equal(
            context.getTimeoutDelay(),
            12 * 60 * 60 * 1000
        );
        assert.deepEqual(
            context.effects.slice(0, 4).map(effect => effect[0]),
            [
                "register",
                "schedule",
                "timer",
                "notification"
            ]
        );

        await context.getTimeoutCallback()();

        assert.equal(
            context.effects.some(effect =>
                effect[0] === "missed"
            ),
            true
        );
        assert.equal(
            context.effects.some(effect =>
                effect[0] === "refresh"
            ),
            true
        );
    }
);

test(
    "un appel qui n'est plus ringing reste inchangé à l'expiration",
    async () => {
        for (
            const status
            of [
                "accepted",
                "ended",
                "cancelled",
                "missed"
            ]
        ) {
            const context = loadStartPage({
                currentStatus: status
            });

            try {
                await context.page.execute(
                    interaction(),
                    10,
                    "caller"
                );
            } finally {
                context.restore();
            }

            await context.getTimeoutCallback()();

            assert.equal(
                context.effects.some(effect =>
                    effect[0] === "missed"
                ),
                false,
                status
            );
        }
    }
);

test(
    "le timer reste enregistré si la notification Discord échoue",
    async () => {
        const context = loadStartPage({
            notificationFails: true
        });

        try {
            const response =
                await context.page.execute(
                    interaction(),
                    10,
                    "caller"
                );

            assert.deepEqual(
                response,
                { ok: true }
            );
        } finally {
            context.restore();
        }

        const timerIndex =
            context.effects.findIndex(effect =>
                effect[0] === "timer"
            );
        const notificationIndex =
            context.effects.findIndex(effect =>
                effect[0] === "notification"
            );

        assert.ok(timerIndex >= 0);
        assert.ok(notificationIndex > timerIndex);
        assert.equal(
            context.effects[timerIndex][2],
            context.timeoutHandle
        );
    }
);
