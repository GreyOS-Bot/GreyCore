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
    "le dÃ©ploiement groupÃ© installe et valide toutes les continuitÃ©s disponibles",
    () => {
        const created = [];
        const approvals = [];
        const ensuredGuilds = [];

        stubModule(
            "src/v2/repositories/OperationUnitOfWork.js",
            {
                run:
                    (operation, data) =>
                        operation(data)
            }
        );
        stubModule(
            "src/v2/repositories/GuildRepository.js",
            {
                ensure:
                    (...data) =>
                        ensuredGuilds.push(data)
            }
        );
        stubModule(
            "src/v2/repositories/DeploymentRepository.js",
            {
                getDeployableSources:
                    guildId => [
                        {
                            id: "continuity-a",
                            character_id: "character-a",
                            proxy_name: "Alba",
                            avatar_url:
                                "https://image.test/alba.png",
                            character_type:
                                "personnage_joue"
                        },
                        {
                            id: "continuity-r",
                            character_id: "character-r",
                            proxy_name: "Figurant",
                            avatar_url: null,
                            character_type: "random"
                        }
                    ]
            }
        );
        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                create:
                    data => {
                        const installation = {
                            id:
                                `installation-${created.length + 1}`,
                            status: data.status,
                            proxy_enabled:
                                data.proxyEnabled
                                    ? 1
                                    : 0,
                            ...data
                        };

                        created.push(installation);

                        return installation;
                    }
            }
        );
        stubModule(
            "src/v2/services/validation/ValidationManagerV2.js",
            {
                approveInstallation:
                    ({
                        installationId,
                        approvedBy
                    }) => {
                        const installation =
                            created.find(
                                item =>
                                    item.id ===
                                    installationId
                            );

                        approvals.push({
                            installationId,
                            approvedBy,
                            statusBefore:
                                installation.status
                        });

                        return {
                            installation: {
                                ...installation,
                                status: "approved",
                                proxy_enabled: 1,
                                approved_by: approvedBy
                            }
                        };
                    }
            }
        );
        stubModule(
            "src/v2/core/character/CharacterTypeCatalog.js",
            {
                getInstallationVisibility:
                    type =>
                        type === "random"
                            ? "shared"
                            : "private"
            }
        );
        stubModule(
            "src/v2/managers/ContinuityV2Manager.js",
            {}
        );
        stubModule(
            "src/v2/managers/ProfileV2Manager.js",
            {}
        );
        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {}
        );

        const servicePath =
            require.resolve(
                "../src/v2/services/deployment/DeploymentV2Service"
            );

        delete require.cache[
            servicePath
        ];

        const service =
            require(
                "../src/v2/services/deployment/DeploymentV2Service"
            );

        const result =
            service.deployAllExisting({
                guildId: "guild-beta",
                guildName: "Serveur Beta",
                approvedBy: "staff"
            });

        assert.equal(
            result.total,
            2
        );
        assert.deepEqual(
            ensuredGuilds,
            [
                [
                    "guild-beta",
                    "Serveur Beta",
                    ensuredGuilds[0][2]
                ]
            ]
        );
        assert.deepEqual(
            created.map(item => ({
                characterId:
                    item.characterId,
                continuityId:
                    item.continuityId,
                guildId:
                    item.guildId,
                status:
                    item.status,
                visibility:
                    item.visibility,
                proxyEnabled:
                    item.proxyEnabled,
                localAvatarUrl:
                    item.localAvatarUrl
            })),
            [
                {
                    characterId: "character-a",
                    continuityId: "continuity-a",
                    guildId: "guild-beta",
                    status: "pending",
                    visibility: "private",
                    proxyEnabled: false,
                    localAvatarUrl:
                        "https://image.test/alba.png"
                },
                {
                    characterId: "character-r",
                    continuityId: "continuity-r",
                    guildId: "guild-beta",
                    status: "pending",
                    visibility: "shared",
                    proxyEnabled: false,
                    localAvatarUrl: null
                }
            ]
        );
        assert.deepEqual(
            approvals,
            [
                {
                    installationId: "installation-1",
                    approvedBy: "staff",
                    statusBefore: "pending"
                },
                {
                    installationId: "installation-2",
                    approvedBy: "staff",
                    statusBefore: "pending"
                }
            ]
        );
        assert.deepEqual(
            result.deployments.map(item =>
                item.installation.status
            ),
            [
                "approved",
                "approved"
            ]
        );
    }
);
