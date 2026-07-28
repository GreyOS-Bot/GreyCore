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
    "une modification de fiche validée est transmise au staff sans écraser la fiche active",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getDashboardData:
                    () => ({
                        character: {
                            id:
                                "character",
                            discord_user_id:
                                "owner"
                        },
                        continuity: {
                            id:
                                "continuity"
                        },
                        profile: {
                            firstname:
                                "Alba"
                        }
                    })
            }
        );

        stubModule(
            "src/v2/core/policies/CharacterManagementPolicy.js",
            {
                isOwner:
                    () => true
            }
        );

        stubModule(
            "src/v2/managers/ProfileV2Manager.js",
            {
                getOrCreate:
                    () => ({
                        firstname:
                            "Alba"
                    }),
                update:
                    () => calls.push(
                        "profile.update"
                    )
            }
        );

        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getByContinuityAndGuild:
                    () => ({
                        id:
                            "installation",
                        status:
                            "approved"
                    })
            }
        );

        stubModule(
            "src/v2/managers/CharacterChangeRequestV2Manager.js",
            {
                types: {
                    PROFILE_IDENTITY:
                        "profile_identity"
                }
            }
        );

        stubModule(
            "src/v2/services/validation/ChangeRequestSubmissionService.js",
            {
                submit:
                    async data => {
                        calls.push([
                            "submit",
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

        const accessPath =
            require.resolve(
                "../src/v2/interactions/profile/ProfileEditAccessService"
            );

        const submissionPath =
            require.resolve(
                "../src/v2/interactions/profile/ProfileEditSubmissionHandler"
            );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/profile/ProfileEditHandler"
            );

        delete require.cache[accessPath];
        delete require.cache[submissionPath];
        delete require.cache[handlerPath];

        const handler =
            require(
                "../src/v2/interactions/profile/ProfileEditHandler"
            );

        const interaction = {
            guildId:
                "guild",
            guild: {
                id:
                    "guild"
            },
            user: {
                id:
                    "owner"
            },
            inGuild:
                () => true,
            fields: {
                getTextInputValue: field => ({
                    firstname:
                        "Vega",
                    lastname:
                        "Grey",
                    age:
                        "24",
                    birthday:
                        ""
                })[field] || ""
            },
            reply: async payload => {
                interaction.replyPayload = payload;
            }
        };

        await handler.submitIdentity(
            interaction,
            "character"
        );

        assert.equal(
            calls.some(call =>
                call === "profile.update"
            ),
            false
        );

        assert.deepEqual(
            calls[0][1].changes,
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
        );

        assert.match(
            interaction.replyPayload.content,
            /envoyée au staff/
        );
    }
);
