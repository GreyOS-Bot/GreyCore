const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "les décisions de validation sont conservées dans l’ordre le plus récent",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createInstallationTables(
                isolated.database
            );

            const repositoryPath =
                require.resolve(
                    "../src/v2/repositories/ValidationRepository"
                );

            delete require.cache[
                repositoryPath
            ];

            const repository =
                require(
                    "../src/v2/repositories/ValidationRepository"
                );

            repository.submit(
                1,
                {
                    submittedBy: "owner",
                    submittedAt:
                        "2026-07-27T10:00:00.000Z"
                }
            );

            repository.reject(
                1,
                {
                    rejectedBy: "staff",
                    reason: "Compléter l’histoire.",
                    rejectedAt:
                        "2026-07-27T10:05:00.000Z"
                }
            );

            const history =
                repository.getHistory(
                    1,
                    20
                );

            assert.deepEqual(
                history.map(
                    entry => entry.event_type
                ),
                [
                    "rejected",
                    "submitted"
                ]
            );

            assert.equal(
                history[0].reason,
                "Compléter l’histoire."
            );

            assert.equal(
                history[0].actor_id,
                "staff"
            );

            assert.equal(
                history[1].previous_status,
                "draft"
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "la vue d’historique est lisible et mentionne le staff concerné",
    () => {
        const view =
            require(
                "../src/v2/views/validation/ValidationHistoryView"
            );

        const embed =
            view.build({
                installation: {
                    id: 42,
                    proxy_name: "Reya",
                    status: "rejected"
                },
                entries: [
                    {
                        event_type: "rejected",
                        actor_id: "33412153137990410",
                        reason: "Avatar manquant.",
                        occurred_at:
                            "2026-07-27T10:05:00.000Z"
                    }
                ]
            }).embeds[0].toJSON();

        assert.equal(
            embed.title,
            "📚 Historique de validation"
        );

        assert.match(
            embed.description,
            /Reya/
        );

        assert.match(
            embed.description,
            /Installation refusée/
        );

        assert.match(
            embed.description,
            /<@33412153137990410>/
        );

        assert.match(
            embed.description,
            /Avatar manquant/
        );
    }
);

test(
    "le bouton d’historique répond seulement au staff du bon serveur",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        getInstallation:
                            () => ({
                                id: "installation",
                                guild_id: "guild",
                                proxy_name: "Reya",
                                status: "approved"
                            }),
                        getHistory:
                            installationId => {
                                calls.push(
                                    installationId
                                );

                                return [];
                            }
                    }
                }
            }
        );
        stubModule(
            "src/v2/core/policies/ValidationStaffPolicy.js",
            {
                canReview:
                    () => true
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyPrivate: async (
                    interaction,
                    payload
                ) => {
                    interaction.payload =
                        payload;
                },
                replyError: async (
                    interaction,
                    message
                ) => {
                    interaction.error =
                        message;
                }
            }
        );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/buttons/openValidationHistory"
            );

        delete require.cache[
            handlerPath
        ];

        const openHistory =
            require(
                "../src/v2/interactions/buttons/openValidationHistory"
            );

        const interaction = {
            customId:
                "v2_validation_history:installation",
            guildId: "guild"
        };

        await openHistory(
            interaction
        );

        assert.deepEqual(
            calls,
            ["installation"]
        );

        assert.equal(
            interaction.payload.embeds[0]
                .toJSON()
                .title,
            "📚 Historique de validation"
        );
    }
);

function createInstallationTables(
    database
) {
    database.exec(`
        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER PRIMARY KEY,
            status TEXT NOT NULL,
            proxy_enabled INTEGER NOT NULL DEFAULT 0,
            submitted_by TEXT,
            submitted_at TEXT,
            approved_by TEXT,
            approved_at TEXT,
            validated_by TEXT,
            validated_at TEXT,
            rejected_by TEXT,
            rejected_at TEXT,
            rejection_reason TEXT,
            suspended_by TEXT,
            suspended_at TEXT,
            suspension_reason TEXT,
            last_status_change_at TEXT,
            updated_at TEXT NOT NULL,
            local_avatar_url TEXT
        );

        CREATE TABLE InstallationValidationHistoryV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            installation_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            previous_status TEXT,
            current_status TEXT NOT NULL,
            actor_id TEXT,
            reason TEXT,
            occurred_at TEXT NOT NULL
        );

        INSERT INTO CharacterGuildInstallationsV2 (
            id,
            status,
            updated_at
        )
        VALUES (
            1,
            'draft',
            '2026-07-27T09:00:00.000Z'
        );
    `);
}
