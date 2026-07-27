const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "l’avatar initial est global et local, puis les changements restent locaux",
    async () => {
        const calls = [];

        const character = {
            id: "character",
            discord_user_id: "user"
        };

        const continuity = {
            id: "continuity"
        };

        const installation = {
            id: "installation",
            character_id:
                character.id,
            continuity_id:
                continuity.id,
            guild_id: "guild"
        };

        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                delete: userId =>
                    calls.push([
                        "pending.delete",
                        userId
                    ])
            }
        );

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () => character,
                updateIdentity: (
                    characterId,
                    changes
                ) => {
                    calls.push([
                        "character.avatar",
                        characterId,
                        changes.avatarUrl
                    ]);

                    return character;
                }
            }
        );

        stubModule(
            "src/v2/managers/ContinuityV2Manager.js",
            {
                getById:
                    () => continuity
            }
        );

        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getById:
                    () => installation,
                setLocalAvatar: (
                    installationId,
                    avatarUrl
                ) => {
                    calls.push([
                        "installation.avatar",
                        installationId,
                        avatarUrl
                    ]);

                    return installation;
                }
            }
        );

        stubModule(
            "src/v2/views/deployment/InstallationCreatedView.js",
            {
                build: () => ({
                    content: "ok"
                })
            }
        );

        stubModule(
            "src/v2/services/validation/InstallationStaffTrackingService.js",
            {
                sync:
                    async data =>
                        calls.push([
                            "staff.sync",
                            data.installationId
                        ])
            }
        );

        stubModule(
            "src/v2/managers/CharacterChangeRequestV2Manager.js",
            {
                types: {
                    AVATAR:
                        "avatar"
                }
            }
        );

        stubModule(
            "src/v2/services/validation/ChangeRequestSubmissionService.js",
            {
                submit:
                    async data => {
                        calls.push([
                            "change.request",
                            data
                        ]);

                        return {
                            validationChannel: {
                                id:
                                    "validation"
                            }
                        };
                    }
            }
        );

        const initialAvatarHandler =
            require(
                "../src/events/handlers/messageCreate/uploads/CharacterAvatarUploadHandler"
            );

        const localAvatarHandler =
            require(
                "../src/events/handlers/messageCreate/uploads/InstallationAvatarUploadHandler"
            );

        const pendingAction = {
            characterId:
                character.id,
            continuityId:
                continuity.id,
            installationId:
                installation.id
        };

        await initialAvatarHandler(
            createImageMessage(),
            pendingAction
        );

        assert.equal(
            countCalls(
                calls,
                "character.avatar"
            ),
            1
        );

        assert.equal(
            countCalls(
                calls,
                "installation.avatar"
            ),
            1
        );

        await localAvatarHandler(
            createImageMessage(),
            pendingAction
        );

        assert.equal(
            countCalls(
                calls,
                "character.avatar"
            ),
            1
        );

        assert.equal(
            countCalls(
                calls,
                "installation.avatar"
            ),
            2
        );

        assert.equal(
            countCalls(
                calls,
                "staff.sync"
            ),
            2
        );

        installation.status =
            "approved";

        await localAvatarHandler(
            createImageMessage(),
            pendingAction
        );

        assert.equal(
            countCalls(
                calls,
                "installation.avatar"
            ),
            2
        );

        assert.equal(
            countCalls(
                calls,
                "change.request"
            ),
            1
        );

        assert.equal(
            calls.find(
                call => call[0] ===
                    "change.request"
            )[1].changes.avatarUrl,
            "https://image.test/avatar.png"
        );
    }
);

function createImageMessage() {
    return {
        author: {
            id: "user"
        },
        guild: {
            id: "guild"
        },
        client: {
            guilds: {
                fetch: async () => ({
                    id: "guild"
                })
            }
        },
        attachments: {
            size: 1,
            first: () => ({
                contentType:
                    "image/png",
                url:
                    "https://image.test/avatar.png"
            })
        },
        reply: async () => {}
    };
}

function countCalls(
    calls,
    callName
) {
    return calls.filter(
        call =>
            call[0] === callName
    ).length;
}
