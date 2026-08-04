const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

const {
    withMutedConsole
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "la validation prévient le propriétaire en message privé",
    async () => {
        const payloads = [];

        const service =
            createNotificationService({});

        assert.equal(
            await service
                .notifyApproval({
                    client:
                        createClient({
                            playerSend:
                                async payload => {
                                    payloads.push(
                                        payload
                                    );
                                }
                        }),
                    playerId:
                        "owner",
                    installationId:
                        "installation",
                    characterName:
                        "Alba",
                    guildName:
                        "GreyCore"
                }),
            true
        );

        assert.equal(
            payloads[0]
                .kind,
            "approved"
        );
    }
);

test(
    "le rappel de creation est envoye en message prive",
    async () => {
        const payloads = [];
        const service =
            createNotificationService({});

        assert.equal(
            await service.notifyReminder({
                client: createClient({
                    playerSend: async payload => {
                        payloads.push(payload);
                    }
                }),
                playerId: "owner",
                installationId: 7,
                characterName: "Reya",
                guildName: "Greyline",
                status: "draft"
            }),
            true
        );

        assert.equal(
            payloads[0].kind,
            "reminder"
        );
    }
);

test(
    "un refus utilise le salon de suivi lorsque les messages privés sont fermés",
    async () => {
        const channelPayloads = [];

        const service =
            createNotificationService({
                installationMessage: {
                    channel_id:
                        "staff-channel"
                }
            });

        const method =
            await withMutedConsole(
                () =>
                    service
                        .notifyRejection({
                            client:
                                createClient({
                                    playerSend:
                                        async () => {
                                            throw new Error(
                                                "MP fermés"
                                            );
                                        },
                                    channelSend:
                                        async payload => {
                                            channelPayloads
                                                .push(
                                                    payload
                                                );
                                        }
                                }),
                            requesterId:
                                "owner",
                            installationId:
                                "installation",
                            characterName:
                                "Alba",
                            guildName:
                                "GreyCore",
                            reason:
                                "Préciser l’histoire."
                        })
            );

        assert.equal(
            method,
            "installation_channel"
        );
        assert.equal(
            channelPayloads[0]
                .content,
            "<@owner>"
        );
        assert.deepEqual(
            channelPayloads[0]
                .allowedMentions
                .users,
            [
                "owner"
            ]
        );
    }
);

function createNotificationService({
    installationMessage =
        null
}) {
    stubModule(
        "src/v2/managers/InstallationMessageV2Manager.js",
        {
            getByInstallationId:
                () =>
                    installationMessage
        }
    );

    stubModule(
        "src/v2/views/validation/ValidationDecisionNotificationView.js",
        {
            approved:
                () => ({
                    kind:
                        "approved"
                }),
            rejected:
                () => ({
                    kind:
                        "rejected",
                    embeds: [],
                    components: []
                }),
            reminder:
                () => ({
                    kind:
                        "reminder"
                })
        }
    );

    const servicePath =
        require.resolve(
            "../src/v2/services/validation/ValidationNotificationService"
        );

    delete require.cache[
        servicePath
    ];

    return require(
        "../src/v2/services/validation/ValidationNotificationService"
    );
}

function createClient({
    playerSend =
        async () => {},
    channelSend =
        async () => {}
} = {}) {
    return {
        users: {
            fetch:
                async () => ({
                    send:
                        playerSend
                })
        },
        channels: {
            fetch:
                async () => ({
                    isTextBased:
                        () => true,
                    send:
                        channelSend
                })
        }
    };
}
