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
    "le personnage complet est installé une seule fois et conserve son avatar",
    () => {
        const harness =
            createDeploymentHarness();

        const first =
            harness.service
                .deployExisting({
                    sourceContinuityId:
                        "source",
                    discordUserId:
                        "owner",
                    guildId:
                        "guild-b",
                    guildName:
                        "Serveur B"
                });

        assert.equal(
            first.created,
            true
        );
        assert.equal(
            first.continuity.id,
            "source"
        );
        assert.equal(
            first.installation
                .local_avatar_url,
            harness.character
                .avatar_url
        );
        assert.equal(
            first.installation.status,
            "draft"
        );

        const second =
            harness.service
                .deployExisting({
                    sourceContinuityId:
                        "source",
                    discordUserId:
                        "owner",
                    guildId:
                        "guild-b",
                    guildName:
                        "Serveur B"
                });

        assert.equal(
            second.created,
            false
        );
        assert.equal(
            harness.installations
                .size,
            1
        );
    }
);

test(
    "une nouvelle continuité crée ses données séparées sur le serveur cible",
    () => {
        const harness =
            createDeploymentHarness();

        const result =
            harness.service
                .deployReset({
                    sourceContinuityId:
                        "source",
                    continuityName:
                        "Nouvelle vie",
                    discordUserId:
                        "owner",
                    guildId:
                        "guild-c",
                    guildName:
                        "Serveur C"
                });

        assert.equal(
            result.created,
            true
        );
        assert.equal(
            result.mode,
            "reset"
        );
        assert.notEqual(
            result.continuity.id,
            "source"
        );
        assert.equal(
            result.continuity
                .source_continuity_id,
            "source"
        );
        assert.equal(
            result.profile
                .continuity_id,
            result.continuity.id
        );
        assert.equal(
            result.phone
                .continuity_id,
            result.continuity.id
        );
        assert.equal(
            result.installation
                .continuity_id,
            result.continuity.id
        );
        assert.equal(
            result.installation
                .local_avatar_url,
            harness.character
                .avatar_url
        );
    }
);

function createDeploymentHarness() {
    const source = {
        id:
            "source",
        character_id:
            "character",
        name:
            "GreyOS",
        firstname:
            "Alba",
        lastname:
            "Grey",
        is_archived:
            0,
        character_is_archived:
            0
    };

    const character = {
        id:
            "character",
        proxy_name:
            "Alba",
        avatar_url:
            "https://image.test/alba.png"
    };

    const installations =
        new Map();

    let nextContinuityId =
        1;

    let nextInstallationId =
        1;

    const database = {
        transaction:
            callback =>
                data =>
                    callback(data),
        prepare:
            sql => {
                if (
                    sql.includes(
                        "FROM CharacterContinuitiesV2"
                    )
                ) {
                    return {
                        get:
                            (
                                continuityId,
                                discordUserId
                            ) =>
                                continuityId ===
                                    source.id
                                && discordUserId ===
                                    "owner"
                                    ? {
                                        ...source
                                    }
                                    : null
                    };
                }

                if (
                    sql.includes(
                        "FROM CharactersV2"
                    )
                ) {
                    return {
                        get:
                            characterId =>
                                characterId ===
                                    character.id
                                    ? {
                                        ...character
                                    }
                                    : null
                    };
                }

                return {
                    run:
                        () => ({})
                };
            }
    };

    const continuityManager = {
        getById:
            continuityId =>
                continuityId ===
                    source.id
                    ? {
                        ...source
                    }
                    : {
                        id:
                            continuityId,
                        character_id:
                            character.id,
                        name:
                            "Nouvelle vie",
                        mode:
                            "reset",
                        source_continuity_id:
                            source.id
                    },
        create:
            data => ({
                id:
                    `continuity-${nextContinuityId++}`,
                character_id:
                    data.characterId,
                name:
                    data.name,
                mode:
                    data.mode,
                source_continuity_id:
                    data.sourceContinuityId
            })
    };

    const profileManager = {
        get:
            () => ({
                firstname:
                    "Alba",
                lastname:
                    "Grey"
            }),
        create:
            data => ({
                continuity_id:
                    data.continuityId,
                firstname:
                    data.firstname,
                lastname:
                    data.lastname
            })
    };

    const phoneManager = {
        createPhone:
            data => ({
                continuity_id:
                    data.continuityId,
                phone_number:
                    "555-0001"
            })
    };

    const installationManager = {
        getByContinuityAndGuild:
            (
                continuityId,
                guildId
            ) =>
                installations.get(
                    `${continuityId}:${guildId}`
                )
                || null,
        createDraft:
            ({
                continuityId,
                guildId
            }) => {
                const installation = {
                    id:
                        `installation-${nextInstallationId++}`,
                    continuity_id:
                        continuityId,
                    guild_id:
                        guildId,
                    status:
                        "draft"
                };

                installations.set(
                    `${continuityId}:${guildId}`,
                    installation
                );

                return installation;
            },
        setLocalAvatar:
            (
                installationId,
                avatarUrl
            ) => {
                const installation =
                    [
                        ...installations
                            .values()
                    ].find(
                        item =>
                            item.id ===
                            installationId
                    );

                installation.local_avatar_url =
                    avatarUrl;

                return installation;
            }
    };

    stubModule(
        "src/database/database.js",
        database
    );
    stubModule(
        "src/v2/managers/ContinuityV2Manager.js",
        continuityManager
    );
    stubModule(
        "src/v2/managers/ProfileV2Manager.js",
        profileManager
    );
    stubModule(
        "src/v2/managers/PhoneV2Manager.js",
        phoneManager
    );
    stubModule(
        "src/v2/managers/InstallationV2Manager.js",
        installationManager
    );

    const servicePath =
        require.resolve(
            "../src/v2/services/deployment/DeploymentV2Service"
        );

    delete require.cache[
        servicePath
    ];

    return {
        service:
            require(
                "../src/v2/services/deployment/DeploymentV2Service"
            ),
        installations,
        character
    };
}
