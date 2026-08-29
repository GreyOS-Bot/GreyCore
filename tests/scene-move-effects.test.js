const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "une transition DB perdante ne publie aucune annonce",
    async () => {
        for (const [
            reason,
            expectedMessage
        ] of [
            [
                "stale_source",
                /modifiée entre-temps/
            ],
            [
                "destination_occupied",
                /autre scène active/
            ]
        ]) {
            const fixture =
                loadHandler({
                    moveResult: {
                        moved: false,
                        reason
                    }
                });

            await fixture.handler.submitMove(
                fixture.interaction,
                "scene",
                "B"
            );

            assert.equal(
                fixture.narrativeCalls.length,
                0
            );
            assert.equal(
                fixture.publicSends.length,
                0
            );
            assert.match(
                fixture.errorMessage,
                expectedMessage
            );
        }
    }
);

test(
    "les annonces post-commit sont indépendantes et signalent tout résultat partiel",
    async () => {
        for (const failedStages of [
            ["source"],
            ["destination"],
            [
                "source",
                "destination"
            ]
        ]) {
            const fixture =
                loadHandler({
                    moveResult: {
                        moved: true
                    },
                    failedStages
                });

            await fixture.handler.submitMove(
                fixture.interaction,
                "scene",
                "B"
            );

            assert.deepEqual(
                fixture.narrativeCalls,
                [
                    "source",
                    "destination"
                ],
                "les deux annonces doivent être tentées"
            );
            assert.equal(
                fixture.order[0],
                "database",
                "la DB doit gagner avant tout effet public"
            );
            assert.match(
                fixture.editPayload.content,
                /bien été déplacée/
            );
            assert.match(
                fixture.editPayload.content,
                /annonces n’a pas pu/
            );
            assert.deepEqual(
                fixture.loggedStages.sort(),
                [...failedStages].sort()
            );
        }
    }
);

test(
    "un déplacement normal vers un thread conserve le chemin narratif existant",
    async () => {
        const fixture =
            loadHandler({
                moveResult: {
                    moved: true
                },
                destinationIsThread:
                    true
            });

        await fixture.handler.submitMove(
            fixture.interaction,
            "scene",
            "B"
        );

        assert.deepEqual(
            fixture.narrativeCalls,
            [
                "source",
                "destination"
            ]
        );
        assert.equal(
            fixture.destination.isThread(),
            true
        );
        assert.match(
            fixture.editPayload.content,
            /sans réinitialiser/
        );
    }
);

test(
    "une reprise devenue périmée perd avant toute annonce",
    async () => {
        let sourceSends = 0;
        let destinationSends = 0;
        let errorMessage = null;

        stubModule(
            "src/v2/managers/SceneAssistantV2Manager.js",
            {
                getScene: () => ({
                    id: "scene",
                    guild_id: "guild",
                    title: "Scène",
                    channel_ids: "B",
                    created_by: "player"
                }),
                moveSceneIfCurrent:
                    () => ({
                        moved: false,
                        reason: "stale_source"
                    })
            }
        );
        stubModule(
            "src/v2/services/scenes/SceneAssistantService.js",
            {}
        );
        stubModule(
            "src/v2/services/entities/NarrativeEntityService.js",
            {
                send: async () => null
            }
        );
        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create: () => ({
                    warn: () => {},
                    error: () => {}
                })
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError:
                    async (
                        interaction,
                        message
                    ) => {
                        errorMessage =
                            message;
                    }
            }
        );
        stubModule(
            "src/v2/core/services/DiscordReferenceResolverService.js",
            {
                resolve: async () => ({
                    available: true,
                    channel: source
                })
            }
        );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/scenes/SceneInteractionHandler"
            );
        delete require.cache[handlerPath];
        const handler =
            require(handlerPath);
        const source = {
            id: "A",
            messages: {
                fetch: async () => ({
                    find: () => null
                })
            },
            send: async () => {
                sourceSends += 1;
            }
        };
        const interaction = {
            values: ["scene|A"],
            guildId: "guild",
            channelId: "C",
            channel: {
                id: "C",
                guildId: "guild",
                isTextBased:
                    () => true,
                send: async () => {
                    destinationSends += 1;
                }
            },
            client: {
                user: {
                    id: "bot"
                },
                channels: {
                    fetch:
                        async () => source
                }
            },
            user: {
                id: "player"
            }
        };

        await handler.selectResume(
            interaction
        );

        assert.equal(sourceSends, 0);
        assert.equal(destinationSends, 0);
        assert.match(
            errorMessage,
            /modifiée entre-temps/
        );
    }
);

function loadHandler({
    moveResult,
    failedStages = [],
    destinationIsThread = false
}) {
    const order = [];
    const narrativeCalls = [];
    const publicSends = [];
    const loggedStages = [];
    let editPayload = null;
    let errorMessage = null;

    const source = {
        id: "A",
        guildId: "guild",
        isTextBased: () => true,
        isThread: () => false,
        messages: {
            fetch: async () => ({
                find: () => null
            })
        },
        send: async () => {
            publicSends.push("source");
            if (
                failedStages.includes(
                    "source"
                )
            ) {
                throw new Error(
                    "Source inaccessible"
                );
            }
        }
    };
    const destination = {
        id: "B",
        guildId: "guild",
        isTextBased: () => true,
        isThread:
            () => destinationIsThread,
        send: async () => {
            publicSends.push(
                "destination"
            );
            if (
                failedStages.includes(
                    "destination"
                )
            ) {
                throw new Error(
                    "Destination inaccessible"
                );
            }
        }
    };

    stubModule(
        "src/v2/managers/SceneAssistantV2Manager.js",
        {
            getScene: () => ({
                id: "scene",
                guild_id: "guild",
                title: "Scène",
                created_by: "player"
            }),
            moveSceneIfCurrent: () => {
                order.push("database");
                return moveResult;
            }
        }
    );
    stubModule(
        "src/v2/services/scenes/SceneAssistantService.js",
        {}
    );
    stubModule(
        "src/v2/services/entities/NarrativeEntityService.js",
        {
            send: async ({
                channel
            }) => {
                const stage =
                    channel.id === "A"
                        ? "source"
                        : "destination";
                narrativeCalls.push(stage);
                order.push(stage);
                if (
                    failedStages.includes(
                        stage
                    )
                ) {
                    throw new Error(
                        `Annonce ${stage} impossible`
                    );
                }
                return {};
            }
        }
    );
    stubModule(
        "src/v2/core/services/TechnicalLogger.js",
        {
            create: () => ({
                warn: () => {},
                error: (
                    message,
                    context
                ) => {
                    loggedStages.push(
                        context.stage
                    );
                }
            })
        }
    );
    stubModule(
        "src/v2/core/services/InteractionResponseService.js",
        {
            deferPrivate:
                async () => {},
            editOrReplyError:
                async (
                    interaction,
                    message
                ) => {
                    errorMessage =
                        message;
                }
        }
    );

    const handlerPath =
        require.resolve(
            "../src/v2/interactions/scenes/SceneInteractionHandler"
        );
    delete require.cache[handlerPath];
    const handler =
        require(handlerPath);
    const interaction = {
        guildId: "guild",
        channelId: "A",
        channel: source,
        client: {
            user: {
                id: "bot"
            },
            channels: {
                fetch:
                    async () =>
                        destination
            }
        },
        fields: {
            getTextInputValue:
                () => ""
        },
        user: {
            id: "player"
        },
        editReply: async payload => {
            editPayload = payload;
        }
    };

    return {
        handler,
        interaction,
        destination,
        order,
        narrativeCalls,
        publicSends,
        loggedStages,
        get editPayload() {
            return editPayload;
        },
        get errorMessage() {
            return errorMessage;
        }
    };
}
