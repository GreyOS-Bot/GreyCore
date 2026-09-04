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
    "une approbation pending est atomique et conserve un historique unique",
    () => {
        const fixture = createPendingDecisionFixture();
        try {
            let sideEffectCount = 0;
            const approved = fixture.repository.approve(1, {
                approvedBy: "staff-a",
                approvedAt: "2026-08-27T10:00:00.000Z"
            });
            sideEffectCount += 1;
            assert.equal(approved.status, "approved");
            assert.equal(sideEffectCount, 1);
            assert.deepEqual(decisionHistory(fixture.repository), ["approved"]);
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "deux approbations concurrentes ne produisent qu’une décision et qu’un effet",
    () => {
        const fixture = createPendingDecisionFixture();
        try {
            let sideEffectCount = 0;
            const approve = staffId => {
                const result = fixture.repository.approve(1, { approvedBy: staffId });
                sideEffectCount += 1;
                return result;
            };
            approve("staff-a");
            assert.throws(() => approve("staff-b"), /déjà été traitée/);
            assert.equal(fixture.repository.getInstallationById(1).approved_by, "staff-a");
            assert.equal(sideEffectCount, 1);
            assert.deepEqual(decisionHistory(fixture.repository), ["approved"]);
        } finally {
            fixture.cleanup();
        }
    }
);

test(
    "approbation et refus concurrents ne produisent aucune décision contradictoire",
    () => {
        for (const firstDecision of ["approve", "reject"]) {
            const fixture = createPendingDecisionFixture();
            try {
                const effects = [];
                const secondDecision = firstDecision === "approve" ? "reject" : "approve";
                runDecision(fixture.repository, firstDecision);
                effects.push(firstDecision);
                assert.throws(() => {
                    runDecision(fixture.repository, secondDecision);
                    effects.push(secondDecision);
                }, /déjà été traitée/);
                assert.equal(
                    fixture.repository.getInstallationById(1).status,
                    firstDecision === "approve" ? "approved" : "rejected"
                );
                assert.deepEqual(effects, [firstDecision]);
                assert.deepEqual(
                    decisionHistory(fixture.repository),
                    [firstDecision === "approve" ? "approved" : "rejected"]
                );
            } finally {
                fixture.cleanup();
            }
        }
    }
);

test(
    "une validation déjà approuvée ou rejetée refuse toute nouvelle décision",
    () => {
        for (const finalStatus of ["approved", "rejected"]) {
            const fixture = createPendingDecisionFixture();
            try {
                runDecision(fixture.repository, finalStatus === "approved" ? "approve" : "reject");
                for (const nextDecision of ["approve", "reject"]) {
                    assert.throws(
                        () => runDecision(fixture.repository, nextDecision),
                        /déjà été traitée/
                    );
                }
                assert.equal(fixture.repository.getInstallationById(1).status, finalStatus);
                assert.equal(decisionHistory(fixture.repository).length, 1);
            } finally {
                fixture.cleanup();
            }
        }
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
            "src/v2/core/services/ValidationPermissionAccessService.js",
            {
                canRead:
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

function createPendingDecisionFixture() {
    const isolated = createIsolatedDatabase();
    createInstallationTables(isolated.database);
    isolated.database.prepare(`
        UPDATE CharacterGuildInstallationsV2
        SET status = 'pending'
        WHERE id = 1
    `).run();
    const repositoryPath = require.resolve(
        "../src/v2/repositories/ValidationRepository"
    );
    delete require.cache[repositoryPath];
    return {
        repository: require("../src/v2/repositories/ValidationRepository"),
        cleanup: isolated.cleanup
    };
}

function runDecision(repository, decision) {
    if (decision === "approve") {
        return repository.approve(1, { approvedBy: "staff-approve" });
    }
    return repository.reject(1, {
        rejectedBy: "staff-reject",
        reason: "À corriger."
    });
}

function decisionHistory(repository) {
    return repository
        .getHistory(1, 20)
        .filter(entry => ["approved", "rejected"].includes(entry.event_type))
        .map(entry => entry.event_type);
}
