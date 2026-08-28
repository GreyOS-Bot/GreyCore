const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase,
    withMutedConsole
} = require("./helpers/isolatedDatabase");
const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "messageCreate et messageUpdate concurrents ne créent qu’un proxy",
    async () => {
        let continueWebhook;
        let signalWebhook;
        let sendCount = 0;
        let sentPayload = null;
        const webhookStarted =
            new Promise(resolve => {
                signalWebhook = resolve;
            });
        const webhookGate =
            new Promise(resolve => {
                continueWebhook = resolve;
            });

        const fixture = await createFixture({
            getWebhook: async () => {
                signalWebhook();
                await webhookGate;

                return {
                    id: "webhook",
                    send: async payload => {
                        sendCount += 1;
                        sentPayload = payload;
                        return {
                            id: "proxy-message"
                        };
                    },
                    deleteMessage: async () => {}
                };
            }
        });

        try {
            const createPromise =
                fixture.createHandler(
                    fixture.message
                );

            await webhookStarted;

            const updateResult =
                await fixture.updateHandler(
                    fixture.message
                );

            continueWebhook();

            assert.equal(
                await createPromise,
                true
            );
            assert.equal(
                updateResult,
                true
            );
            assert.equal(
                sendCount,
                1
            );
            assert.equal(
                sentPayload.threadId,
                "thread"
            );
            assert.equal(
                fixture.manager.get("source")
                    .webhook_message_id,
                "proxy-message"
            );
            assert.equal(
                fixture.countClaims(),
                0
            );

            assert.equal(
                await fixture.createHandler(
                    fixture.message
                ),
                true
            );
            assert.equal(
                sendCount,
                1,
                "un événement rejoué ne doit pas recréer le webhook"
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "un échec avant l’envoi libère la réservation pour une nouvelle tentative",
    async () => {
        const fixture = await createFixture({
            getWebhook: async () => {
                throw new Error(
                    "Webhook indisponible"
                );
            }
        });

        try {
            await assert.rejects(
                fixture.createHandler(
                    fixture.message
                ),
                /Webhook indisponible/
            );

            assert.equal(
                fixture.manager.get("source"),
                undefined
            );
            assert.equal(
                fixture.countClaims(),
                0
            );

            const retryToken =
                fixture.manager.claim(
                    "source"
                );

            assert.ok(retryToken);
            fixture.manager.releaseClaim(
                "source",
                retryToken
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "un échec de finalisation compense le webhook et reste réessayable",
    async () => {
        let compensated = 0;
        let compensationThreadId = null;
        const fixture = await createFixture({
            getWebhook: async () => ({
                id: "webhook",
                send: async () => ({
                    id: "proxy-message"
                }),
                deleteMessage: async (
                    messageId,
                    threadId
                ) => {
                    compensated += 1;
                    compensationThreadId =
                        threadId;
                }
            }),
            failCompletion: true
        });

        try {
            await assert.rejects(
                fixture.createHandler(
                    fixture.message
                ),
                /Finalisation impossible/
            );

            assert.equal(compensated, 1);
            assert.equal(
                compensationThreadId,
                "thread"
            );
            assert.equal(
                fixture.manager.get("source"),
                undefined
            );
            assert.equal(
                fixture.countClaims(),
                0
            );

            const retryToken =
                fixture.manager.claim("source");
            assert.ok(retryToken);
            fixture.manager.releaseClaim(
                "source",
                retryToken
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "un échec de suppression compense le webhook et annule le Proxy final",
    async () => {
        let compensated = 0;
        const fixture = await createFixture({
            getWebhook: async () => ({
                id: "webhook",
                send: async () => ({
                    id: "proxy-message"
                }),
                deleteMessage: async () => {
                    compensated += 1;
                }
            }),
            deletionError:
                new Error("Suppression refusée")
        });

        try {
            await assert.rejects(
                fixture.createHandler(
                    fixture.message
                ),
                /message original n’a pas pu être supprimé/
            );

            assert.equal(compensated, 1);
            assert.equal(
                fixture.manager.get("source"),
                undefined
            );
            assert.equal(
                fixture.countClaims(),
                0
            );

            const retryToken =
                fixture.manager.claim("source");
            assert.ok(
                retryToken,
                "la suppression compensée doit rendre le message réessayable"
            );
            fixture.manager.releaseClaim(
                "source",
                retryToken
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "un webhook déjà absent est une compensation réussie et libère le claim",
    async () => {
        const fixture = await createFixture({
            getWebhook: async () => ({
                id: "webhook",
                send: async () => ({
                    id: "proxy-message"
                }),
                deleteMessage: async () => {
                    const error =
                        new Error("Unknown Message");
                    error.code = 10008;
                    throw error;
                }
            }),
            failCompletion: true
        });

        try {
            await assert.rejects(
                fixture.createHandler(
                    fixture.message
                ),
                /Finalisation impossible/
            );
            assert.equal(
                fixture.countClaims(),
                0
            );
            const retryToken =
                fixture.manager.claim("source");
            assert.ok(retryToken);
            fixture.manager.releaseClaim(
                "source",
                retryToken
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "un claim expiré est repris une seule fois et les anciens tokens restent sans effet",
    async () => {
        const fixture = await createFixture({
            getWebhook: async () => {
                throw new Error("inutilisé");
            }
        });

        try {
            const oldToken =
                fixture.manager.claim("source");

            fixture.database.prepare(`
                UPDATE ProxyMessageClaims
                SET claimed_at = ?
                WHERE discord_message_id = ?
            `).run(
                "2000-01-01T00:00:00.000Z",
                "source"
            );

            const winner =
                fixture.manager.claim("source");
            const loser =
                fixture.manager.claim("source");

            assert.ok(winner);
            assert.notEqual(winner, oldToken);
            assert.equal(loser, null);
            assert.equal(
                fixture.manager.releaseClaim(
                    "source",
                    oldToken
                ).changes,
                0
            );
            assert.equal(
                fixture.manager.refreshClaim(
                    "source",
                    oldToken
                ).changes,
                0
            );
            assert.equal(
                fixture.manager.refreshClaim(
                    "source",
                    winner
                ).changes,
                1
            );
            assert.throws(
                () => fixture.manager.completeClaim(
                    fixture.proxyData,
                    oldToken
                ),
                /réservation.*plus active/
            );
            fixture.manager.releaseClaim(
                "source",
                winner
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "un ancien traitement qui a perdu son claim n’envoie aucun webhook",
    async () => {
        let sendCount = 0;
        let replacementToken = null;
        const fixture = await createFixture({
            getWebhook: async () => ({
                id: "webhook",
                send: async () => {
                    sendCount += 1;
                    return { id: "proxy-message" };
                },
                deleteMessage: async () => {}
            }),
            resolveAvatar: async manager => {
                fixture.database.prepare(`
                    UPDATE ProxyMessageClaims
                    SET claimed_at = ?
                    WHERE discord_message_id = ?
                `).run(
                    "2000-01-01T00:00:00.000Z",
                    "source"
                );
                replacementToken =
                    manager.claim("source");
                return null;
            }
        });

        try {
            await assert.rejects(
                fixture.createHandler(
                    fixture.message
                ),
                /réservation.*plus active/
            );
            assert.ok(replacementToken);
            assert.equal(sendCount, 0);
            assert.equal(fixture.countClaims(), 1);
            fixture.manager.releaseClaim(
                "source",
                replacementToken
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "le rollback conditionnel ne supprime que la ligne créée par la même opération",
    async () => {
        const fixture = await createFixture({
            getWebhook: async () => {
                throw new Error("inutilisé");
            }
        });

        try {
            const token =
                fixture.manager.claim("source");
            fixture.manager.completeClaim(
                fixture.proxyData,
                token
            );

            assert.equal(
                fixture.manager.deleteIfMatches({
                    discordMessageId: "source",
                    webhookMessageId: "autre-message",
                    webhookId: "webhook"
                }).changes,
                0
            );
            assert.ok(
                fixture.manager.get("source")
            );
            assert.equal(
                fixture.manager.deleteIfMatches({
                    discordMessageId: "source",
                    webhookMessageId: "proxy-message",
                    webhookId: "webhook"
                }).changes,
                1
            );
            assert.equal(
                fixture.manager.get("source"),
                undefined
            );
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "un 10015 de compensation après finalisation conserve la ligne et bloque le replay",
    async () => {
        let sendCount = 0;
        const loggedErrors = [];
        const originalConsoleError =
            console.error;
        const fixture = await createFixture({
            getWebhook: async () => ({
                id: "webhook",
                send: async () => {
                    sendCount += 1;
                    return { id: "proxy-message" };
                },
                deleteMessage: async () => {
                    const error = new Error(
                        "Unknown Webhook"
                    );
                    error.code = 10015;
                    throw error;
                }
            }),
            deletionError:
                new Error("Suppression originale refusée")
        });

        console.error = (...args) => {
            loggedErrors.push(args);
        };

        try {
            await assert.rejects(
                fixture.createHandler(
                    fixture.message
                ),
                /message original n’a pas pu être supprimé/
            );

            assert.equal(sendCount, 1);
            assert.ok(
                fixture.manager.get("source"),
                "le Proxy existant doit rester suivi"
            );
            assert.equal(loggedErrors.length, 1);

            assert.equal(
                await fixture.createHandler(
                    fixture.message
                ),
                true
            );
            assert.equal(sendCount, 1);
        } finally {
            console.error =
                originalConsoleError;
            fixture.cleanup();
        }
    }
);

test(
    "un 10015 de compensation avant finalisation conserve temporairement le claim",
    async () => {
        const originalConsoleError =
            console.error;
        let logged = false;
        const fixture = await createFixture({
            getWebhook: async () => ({
                id: "webhook",
                send: async () => ({
                    id: "proxy-message"
                }),
                deleteMessage: async () => {
                    const error = new Error(
                        "Unknown Webhook"
                    );
                    error.code = 10015;
                    throw error;
                }
            }),
            failCompletion: true
        });

        console.error = () => {
            logged = true;
        };

        try {
            await assert.rejects(
                fixture.createHandler(
                    fixture.message
                ),
                /Finalisation impossible/
            );
            assert.equal(logged, true);
            assert.equal(
                fixture.manager.get("source"),
                undefined
            );
            assert.equal(
                fixture.countClaims(),
                1,
                "le claim est conservé jusqu’à son TTL pour éviter un doublon immédiat"
            );
        } finally {
            console.error =
                originalConsoleError;
            fixture.cleanup();
        }
    }
);

test(
    "un Proxy persiste les IDs du webhook gagnant après récupération 10015",
    async () => {
        const managerPath = require.resolve(
            "../src/webhooks/webhookManager"
        );
        delete require.cache[managerPath];
        const webhookManager = require(managerPath);
        const sentPayloads = [];
        const unknownWebhook = new Error(
            "Unknown Webhook"
        );
        unknownWebhook.code = 10015;
        const firstWebhook = {
            id: "100",
            owner: { id: "greycore" },
            name: "Greycore Proxy",
            createdTimestamp: 100,
            send: async payload => {
                sentPayloads.push(payload);
                throw unknownWebhook;
            }
        };
        const secondWebhook = {
            id: "200",
            owner: { id: "greycore" },
            name: "Greycore Proxy",
            createdTimestamp: 200,
            send: async payload => {
                sentPayloads.push(payload);
                return { id: "message-200" };
            }
        };
        let resolution = 0;

        const fixture = await createFixture({
            getWebhook: async () => firstWebhook,
            sendWithWebhook: (channel, payload) =>
                webhookManager.sendWithWebhook(
                    channel,
                    payload
                )
        });

        fixture.message.channel.parent = {
            client: { user: { id: "greycore" } },
            fetchWebhooks: async () => {
                resolution += 1;
                const webhooks =
                    resolution === 1
                        ? [firstWebhook]
                        : [firstWebhook, secondWebhook];
                return new Map(
                    webhooks.map(webhook => [
                        webhook.id,
                        webhook
                    ])
                );
            },
            createWebhook: async () => {
                throw new Error("Création inattendue");
            }
        };

        try {
            assert.equal(
                await fixture.createHandler(
                    fixture.message
                ),
                true
            );
            const stored = fixture.manager.get(
                fixture.message.id
            );
            assert.equal(stored.webhook_id, "200");
            assert.equal(
                stored.webhook_message_id,
                "message-200"
            );
            assert.equal(fixture.countClaims(), 0);
            assert.equal(resolution, 2);
            assert.equal(sentPayloads.length, 2);
            assert.equal(
                sentPayloads[1].threadId,
                "thread"
            );
        } finally {
            fixture.cleanup();
        }
    }
);

async function createFixture({
    getWebhook,
    sendWithWebhook = null,
    failCompletion = false,
    deletionError = null,
    resolveAvatar = async () => null
}) {
    const isolated =
        createIsolatedDatabase();

    await withMutedConsole(
        () => require(
            "../src/database/schema"
        ).initializeDatabase()
    );

    const now =
        "2026-08-27T12:00:00.000Z";

    isolated.database.prepare(`
        INSERT INTO Guilds (
            id,
            name,
            created_at
        )
        VALUES (?, ?, ?)
    `).run(
        "guild",
        "GreyCore",
        now
    );

    const user =
        isolated.database.prepare(`
            INSERT INTO UsersV2 (
                discord_user_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?)
        `).run(
            "owner",
            now,
            now
        );

    isolated.database.prepare(`
        INSERT INTO CharactersV2 (
            id,
            owner_user_id,
            proxy_name,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?)
    `).run(
        "character",
        user.lastInsertRowid,
        "Reya",
        now,
        now
    );

    const managerPath =
        require.resolve(
            "../src/managers/ProxyMessageManager"
        );
    delete require.cache[
        managerPath
    ];

    const manager =
        require(
            "../src/managers/ProxyMessageManager"
        );
    const completeClaim =
        manager.completeClaim.bind(
            manager
        );

    if (failCompletion) {
        manager.completeClaim = () => {
            throw new Error(
                "Finalisation impossible"
            );
        };
    }

    stubModule(
        "src/services/proxyService.js",
        {
            parseProxy: () => ({
                character: "Reya",
                content: "Bonjour"
            })
        }
    );
    stubModule(
        "src/services/proxy/ProxyCharacterResolver.js",
        {
            resolveProxyCharacter: () => ({
                character: {
                    id: "character",
                    name: "Reya",
                    avatar: null
                },
                v2Installation: {
                    character_id:
                        "character",
                    character_type:
                        "personnage_joue"
                }
            }),
            resolveCharacterByReference:
                () => null,
            matchesCharacterReference:
                () => true
        }
    );
    stubModule(
        "src/webhooks/webhookManager.js",
        {
            getOrCreateWebhook:
                getWebhook,
            sendWithWebhook:
                sendWithWebhook
                || (async (channel, payload) => {
                    const webhook =
                        await getWebhook(channel);
                    const webhookMessage =
                        await webhook.send({
                            ...payload,
                            threadId:
                                channel.isThread?.()
                                    ? channel.id
                                    : undefined
                        });

                    return {
                        webhook,
                        webhookMessage
                    };
                })
        }
    );
    stubModule(
        "src/services/internalDeleteService.js",
        {
            markInternalDelete:
                () => {}
        }
    );
    stubModule(
        "src/v2/core/policies/ValidationStaffPolicy.js",
        {
            canManageServerTools:
                () => false
        }
    );
    stubModule(
        "src/v2/core/services/OriginalMessageDeletionService.js",
        {
            delete: async () => {
                if (deletionError) {
                    throw deletionError;
                }
            }
        }
    );
    stubModule(
        "src/v2/core/services/DiscordAttachmentUrlService.js",
        {
            resolve: async () =>
                resolveAvatar(manager)
        }
    );

    const createHandlerPath =
        require.resolve(
            "../src/events/handlers/messageCreate/ProxyMessageHandler"
        );
    const updateHandlerPath =
        require.resolve(
            "../src/events/handlers/messageUpdate/ProxyMessageUpdateHandler"
        );
    delete require.cache[
        createHandlerPath
    ];
    delete require.cache[
        updateHandlerPath
    ];

    const channel = {
        id: "thread",
        isThread: () => true
    };
    const message = {
        id: "source",
        guild: {
            id: "guild"
        },
        guildId: "guild",
        channel,
        channelId: "thread",
        content: "Reya: Bonjour",
        author: {
            id: "owner",
            bot: false
        },
        member: {
            permissions: null
        },
        client: {},
        attachments: new Map()
    };

    return {
        manager,
        database:
            isolated.database,
        proxyData: {
            discordMessageId: "source",
            webhookMessageId: "proxy-message",
            webhookId: "webhook",
            channelId: "thread",
            guildId: "guild",
            authorId: "owner",
            characterId: "character"
        },
        message,
        createHandler:
            require(createHandlerPath),
        updateHandler:
            require(updateHandlerPath),
        countClaims: () =>
            isolated.database.prepare(`
                SELECT COUNT(*) AS count
                FROM ProxyMessageClaims
            `).get().count,
        cleanup() {
            manager.completeClaim =
                completeClaim;
            isolated.cleanup();
        }
    };
}
