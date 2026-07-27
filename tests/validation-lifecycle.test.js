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
    "une installation suit le cycle refus, nouvelle soumission et validation",
    () => {
        const installation = {
            id:
                "installation",
            character_id:
                "character",
            guild_id:
                "guild",
            status:
                "draft",
            proxy_enabled:
                0,
            avatar_url:
                "https://image.test/avatar.png"
        };

        stubModule(
            "src/v2/core/services/InstallationContextService.js",
            {
                build:
                    () => ({
                        installation: {
                            ...installation
                        },
                        status:
                            installation
                                .status,
                        avatarUrl:
                            installation
                                .avatar_url
                    })
            }
        );

        stubModule(
            "src/v2/repositories/ValidationRepository.js",
            createValidationRepository(
                installation
            )
        );

        const managerPath =
            require.resolve(
                "../src/v2/services/validation/ValidationManagerV2"
            );

        delete require.cache[
            managerPath
        ];

        const manager =
            require(
                "../src/v2/services/validation/ValidationManagerV2"
            );

        assert.equal(
            manager
                .submitInstallation({
                    installationId:
                        installation.id,
                    submittedBy:
                        "owner"
                })
                .previousStatus,
            "draft"
        );

        assert.equal(
            installation.status,
            "pending"
        );

        manager.rejectInstallation({
            installationId:
                installation.id,
            rejectedBy:
                "staff",
            reason:
                "Le passé doit être précisé."
        });

        assert.equal(
            installation.status,
            "rejected"
        );
        assert.equal(
            installation.proxy_enabled,
            0
        );
        assert.equal(
            installation
                .rejection_reason,
            "Le passé doit être précisé."
        );

        manager.submitInstallation({
            installationId:
                installation.id,
            submittedBy:
                "owner"
        });

        assert.equal(
            installation.status,
            "pending"
        );

        manager.approveInstallation({
            installationId:
                installation.id,
            approvedBy:
                "staff"
        });

        assert.equal(
            installation.status,
            "approved"
        );
        assert.equal(
            installation.proxy_enabled,
            1
        );
    }
);

test(
    "un échec d’enregistrement staff remet la demande en brouillon",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        submitInstallation:
                            () => {
                                calls.push(
                                    "submit"
                                );

                                return {
                                    installation: {
                                        id:
                                            "installation"
                                    }
                                };
                            },
                        getInstallationContext:
                            () => ({
                                id:
                                    "installation"
                            }),
                        storeValidationMessage:
                            () => {
                                calls.push(
                                    "store"
                                );

                                throw new Error(
                                    "Base indisponible"
                                );
                            },
                        cancelSubmission:
                            () => {
                                calls.push(
                                    "cancel"
                                );
                            }
                    }
                },
                builders: {
                    validationCard: {
                        build:
                            () => ({
                                content:
                                    "validation"
                            })
                    }
                }
            }
        );

        const staffMessage = {
            id:
                "staff-message",
            edit:
                async () => {
                    calls.push(
                        "close"
                    );
                }
        };

        let trackingCount =
            0;

        stubModule(
            "src/v2/services/validation/InstallationStaffTrackingService.js",
            {
                sync:
                    async () => {
                        trackingCount +=
                            1;

                        calls.push(
                            trackingCount === 1
                                ? "track"
                                : "restore"
                        );

                        return staffMessage;
                    }
            }
        );

        const servicePath =
            require.resolve(
                "../src/v2/services/validation/ValidationSubmissionService"
            );

        delete require.cache[
            servicePath
        ];

        const service =
            require(
                "../src/v2/services/validation/ValidationSubmissionService"
            );

        await assert.rejects(
            service.submit({
                installation: {
                    id:
                        "installation"
                },
                submittedBy:
                    "owner",
                guild: {
                    id:
                        "guild",
                    name:
                        "GreyCore"
                },
                validationChannel: {
                    id:
                        "staff-channel"
                }
            }),
            /Base indisponible/
        );

        assert.deepEqual(
            calls,
            [
                "submit",
                "track",
                "store",
                "cancel",
                "restore"
            ]
        );
    }
);

test(
    "la correction après refus est bloquée dès que le statut a changé",
    () => {
        let characterLookupCount =
            0;

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        getInstallation:
                            () => ({
                                id:
                                    "installation",
                                continuity_id:
                                    "continuity",
                                status:
                                    "pending"
                            })
                    },
                    continuity: {
                        getById:
                            () => ({
                                id:
                                    "continuity"
                            })
                    },
                    user: {
                        getOrCreate:
                            () => ({
                                id:
                                    "user"
                            })
                    },
                    library: {
                        getCharacterForUser:
                            () => {
                                characterLookupCount +=
                                    1;

                                return {};
                            }
                    },
                    profile: {
                        get:
                            () => null
                    }
                }
            }
        );

        const servicePath =
            require.resolve(
                "../src/v2/services/validation/RejectedProfileContextService"
            );

        delete require.cache[
            servicePath
        ];

        const service =
            require(
                "../src/v2/services/validation/RejectedProfileContextService"
            );

        const context =
            service.resolve(
                {
                    user: {
                        id:
                            "owner"
                    }
                },
                "installation"
            );

        assert.match(
            context.error,
            /plus en attente de correction/
        );
        assert.equal(
            characterLookupCount,
            0
        );
    }
);

function createValidationRepository(
    installation
) {
    return {
        submit:
            (
                installationId,
                {
                    submittedBy
                }
            ) => {
                installation.status =
                    "pending";
                installation.proxy_enabled =
                    0;
                installation.submitted_by =
                    submittedBy;

                return {
                    ...installation
                };
            },
        reject:
            (
                installationId,
                {
                    rejectedBy,
                    reason
                }
            ) => {
                installation.status =
                    "rejected";
                installation.proxy_enabled =
                    0;
                installation.rejected_by =
                    rejectedBy;
                installation.rejection_reason =
                    reason;

                return {
                    ...installation
                };
            },
        approve:
            (
                installationId,
                {
                    approvedBy
                }
            ) => {
                installation.status =
                    "approved";
                installation.proxy_enabled =
                    1;
                installation.approved_by =
                    approvedBy;

                return {
                    ...installation
                };
            },
        countApprovedInstallationsForCharacterOnGuild:
            () => 0
    };
}
