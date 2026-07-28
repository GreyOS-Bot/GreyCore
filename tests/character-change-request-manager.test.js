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
    "une modification validée reste en attente puis est appliquée seulement après décision staff",
    () => {
        const calls = [];
        const requests = [];

        const installation = {
            id:
                "installation",
            character_id:
                "character",
            continuity_id:
                "continuity",
            status:
                "approved"
        };

        const profile = {
            firstname:
                "Alba",
            lastname:
                "Grey",
            age:
                "23",
            birthday:
                null,
            origin:
                null,
            occupation:
                null,
            gang:
                null,
            story:
                "Avant"
        };

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () => ({
                        id:
                            "character",
                        discord_user_id:
                            "owner"
                    })
            }
        );

        stubModule(
            "src/v2/managers/ProfileV2Manager.js",
            {
                getOrCreate:
                    () => profile,
                update: (
                    continuityId,
                    changes
                ) => {
                    calls.push([
                        "profile.update",
                        continuityId,
                        changes
                    ]);

                    Object.assign(
                        profile,
                        changes
                    );
                }
            }
        );

        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getById:
                    () => installation,
                getEffectiveAvatar:
                    () => ({
                        avatar_url:
                            "https://image.test/old.png"
                    }),
                setLocalAvatar: (
                    installationId,
                    avatarUrl
                ) => calls.push([
                    "avatar.update",
                    installationId,
                    avatarUrl
                ])
            }
        );

        stubModule(
            "src/v2/repositories/CharacterChangeRequestRepository.js",
            createRepository(requests)
        );

        const managerPath =
            require.resolve(
                "../src/v2/managers/CharacterChangeRequestV2Manager"
            );

        delete require.cache[
            managerPath
        ];

        const manager =
            require(
                "../src/v2/managers/CharacterChangeRequestV2Manager"
            );

        const profileRequest =
            manager.create({
                installationId:
                    installation.id,
                characterId:
                    installation.character_id,
                continuityId:
                    installation.continuity_id,
                requestType:
                    manager.types.PROFILE_IDENTITY,
                changes: {
                    firstname:
                        "Vega",
                    lastname:
                        "Grey",
                    age:
                        "24",
                    birthday:
                        null,
                    gender:
                        null
                },
                submittedBy:
                    "owner"
            });

        assert.equal(
            profile.firstname,
            "Alba"
        );

        assert.equal(
            profileRequest.status,
            "pending"
        );

        manager.approve({
            requestId:
                profileRequest.id,
            reviewedBy:
                "staff"
        });

        assert.deepEqual(
            calls[0],
            [
                "profile.update",
                "continuity",
                {
                    firstname:
                        "Vega",
                    lastname:
                        "Grey",
                    age:
                        "24",
                    birthday:
                        null,
                    gender:
                        null
                }
            ]
        );

        assert.equal(
            profile.firstname,
            "Vega"
        );

        const avatarRequest =
            manager.create({
                installationId:
                    installation.id,
                characterId:
                    installation.character_id,
                continuityId:
                    installation.continuity_id,
                requestType:
                    manager.types.AVATAR,
                changes: {
                    avatarUrl:
                        "https://image.test/new.png"
                },
                submittedBy:
                    "owner"
            });

        assert.equal(
            calls.some(call =>
                call[0] === "avatar.update"
            ),
            false
        );

        manager.approve({
            requestId:
                avatarRequest.id,
            reviewedBy:
                "staff"
        });

        assert.deepEqual(
            calls[1],
            [
                "avatar.update",
                "installation",
                "https://image.test/new.png"
            ]
        );

        assert.throws(
            () => manager.create({
                installationId:
                    installation.id,
                characterId:
                    installation.character_id,
                continuityId:
                    installation.continuity_id,
                requestType:
                    manager.types.PROFILE_STORY,
                changes: {
                    story:
                        "Avant"
                },
                submittedBy:
                    "owner"
            }),
            /Aucune modification/
        );
    }
);

function createRepository(requests) {
    return {
        getById: requestId =>
            requests.find(request =>
                request.id === Number(requestId)
            ) || null,
        requireById(requestId) {
            const request = this.getById(requestId);

            if (!request) {
                throw new Error("introuvable");
            }

            return request;
        },
        getPending: (
            installationId,
            requestType
        ) => requests.find(request =>
            request.installation_id === installationId
            && request.request_type === requestType
            && request.status === "pending"
        ) || null,
        create(data) {
            const request = {
                id:
                    requests.length + 1,
                installation_id:
                    data.installationId,
                character_id:
                    data.characterId,
                continuity_id:
                    data.continuityId,
                request_type:
                    data.requestType,
                changes_json:
                    data.changesJson,
                status:
                    "pending",
                submitted_by:
                    data.submittedBy
            };

            requests.push(request);
            return request;
        },
        approve(requestId, data) {
            const request = this.requireById(requestId);

            request.status = "approved";
            request.reviewed_by = data.reviewedBy;
            return request;
        },
        reject: () => null,
        cancel: () => null,
        storeValidationMessage: () => null,
        getContext: () => null
    };
}
