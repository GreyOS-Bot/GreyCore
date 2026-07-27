const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "l’édition du profil conserve formulaires, permissions et enregistrements après sa découpe",
    async () => {
        const calls = [];

        const dashboard = {
            character: {
                id:
                    "character",
                owner_id:
                    "user"
            },
            continuity: {
                id:
                    "continuity"
            },
            profile: {
                continuity_id:
                    "continuity",
                firstname:
                    "Alba",
                lastname:
                    "Grey",
                age:
                    "23 ans",
                birthday:
                    "12 avril 2003",
                origin:
                    "Los Santos",
                occupation:
                    "Artiste",
                gang:
                    "La Mano de Dios",
                story:
                    "Une longue histoire"
            }
        };

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getDashboardData:
                    characterId => {
                        if (
                            characterId ===
                            "missing"
                        ) {
                            return null;
                        }

                        if (
                            characterId ===
                            "without-continuity"
                        ) {
                            return {
                                character: {
                                    id:
                                        characterId,
                                    owner_id:
                                        "user"
                                },
                                continuity:
                                    null,
                                profile:
                                    {}
                            };
                        }

                        return dashboard;
                    }
            }
        );

        stubModule(
            "src/v2/managers/ProfileV2Manager.js",
            {
                getOrCreate:
                    continuityId =>
                        calls.push([
                            "profile.ensure",
                            continuityId
                        ]),
                update:
                    (
                        continuityId,
                        data
                    ) =>
                        calls.push([
                            "profile.update",
                            continuityId,
                            data
                        ])
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
                            "draft"
                    })
            }
        );

        stubModule(
            "src/v2/pages/character/CharacterProfilePage.js",
            {
                execute:
                    async (
                        interaction,
                        characterId
                    ) =>
                        calls.push([
                            "profile.page",
                            characterId
                        ])
            }
        );

        stubModule(
            "src/v2/interactions/buttons/openProfileStory.js",
            {
                execute:
                    async interaction =>
                        calls.push([
                            "story.page",
                            interaction.customId
                        ])
            }
        );

        const handler =
            require(
                "../src/v2/interactions/profile/ProfileEditHandler"
            );

        assert.deepEqual(
            Object.keys(handler).sort(),
            [
                "openIdentity",
                "openInformation",
                "openStory",
                "submitIdentity",
                "submitInformation",
                "submitStory"
            ]
        );

        const identityInteraction =
            createInteraction();

        await handler.openIdentity(
            identityInteraction,
            "character"
        );

        assert.equal(
            identityInteraction.modal
                .toJSON()
                .custom_id,
            "v2_profile_identity_submit:character"
        );

        assert.deepEqual(
            modalFieldIds(
                identityInteraction.modal
            ),
            [
                "firstname",
                "lastname",
                "age",
                "birthday"
            ]
        );

        const informationInteraction =
            createInteraction();

        await handler.openInformation(
            informationInteraction,
            "character"
        );

        assert.equal(
            informationInteraction.modal
                .toJSON()
                .custom_id,
            "v2_profile_information_submit:character"
        );

        assert.deepEqual(
            modalFieldIds(
                informationInteraction
                    .modal
            ),
            [
                "origin",
                "occupation",
                "gang"
            ]
        );

        const storyInteraction =
            createInteraction();

        await handler.openStory(
            storyInteraction,
            "character"
        );

        assert.equal(
            storyInteraction.modal
                .toJSON()
                .custom_id,
            "v2_profile_story_submit:character"
        );

        const identitySubmit =
            createInteraction({
                firstname:
                    "  Alba  ",
                lastname:
                    "   ",
                age:
                    " 23 ans ",
                birthday:
                    ""
            });

        await handler.submitIdentity(
            identitySubmit,
            "character"
        );

        const identityUpdate =
            calls.find(
                call =>
                    call[0] ===
                        "profile.update"
                    && Object.hasOwn(
                        call[2],
                        "firstname"
                    )
            );

        assert.deepEqual(
            identityUpdate[2],
            {
                firstname:
                    "Alba",
                lastname:
                    null,
                age:
                    "23 ans",
                birthday:
                    null
            }
        );

        const informationSubmit =
            createInteraction({
                origin:
                    "  Los Santos ",
                occupation:
                    "  Artiste ",
                gang:
                    "  La Mano  "
            });

        await handler
            .submitInformation(
                informationSubmit,
                "character"
            );

        const informationUpdate =
            calls.find(
                call =>
                    call[0] ===
                        "profile.update"
                    && Object.hasOwn(
                        call[2],
                        "origin"
                    )
            );

        assert.deepEqual(
            informationUpdate[2],
            {
                origin:
                    "Los Santos",
                occupation:
                    "Artiste",
                gang:
                    "La Mano"
            }
        );

        const storySubmit =
            createInteraction({
                story:
                    "  Nouveau récit  "
            });

        await handler.submitStory(
            storySubmit,
            "character"
        );

        assert.equal(
            storySubmit.customId,
            "v2_profile_story_view:character:0"
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] ===
                        "story.page"
                    && call[1] ===
                        "v2_profile_story_view:character:0"
            ),
            true
        );

        const deniedInteraction =
            createInteraction(
                {},
                "other-user"
            );

        await handler.openIdentity(
            deniedInteraction,
            "character"
        );

        assert.equal(
            deniedInteraction.modal,
            undefined
        );

        assert.match(
            deniedInteraction
                .replied
                .content,
            /ne pouvez pas modifier/
        );

        const staffInteraction =
            createInteraction(
                {},
                "staff",
                true
            );

        await handler.openInformation(
            staffInteraction,
            "character"
        );

        assert.equal(
            staffInteraction.modal,
            undefined
        );

        assert.match(
            staffInteraction
                .replied
                .content,
            /ne pouvez pas modifier/
        );

        const noContinuityInteraction =
            createInteraction({
                firstname:
                    "Alba"
            });

        await handler.submitIdentity(
            noContinuityInteraction,
            "without-continuity"
        );

        assert.match(
            noContinuityInteraction
                .replied
                .content,
            /continuité/
        );
    }
);

function createInteraction(
    values = {},
    userId = "user",
    isStaff = false
) {
    return {
        guildId:
            "guild",
        user: {
            id:
                userId
        },
        memberPermissions: {
            has:
                () => isStaff
        },
        fields: {
            getTextInputValue:
                fieldId =>
                    values[fieldId]
                    || ""
        },
        reply: async function (
            payload
        ) {
            this.replied = payload;
        },
        showModal: async function (
            modal
        ) {
            this.modal = modal;
        }
    };
}

function modalFieldIds(
    modal
) {
    return modal
        .toJSON()
        .components
        .map(
            row =>
                row.components[0]
                    .custom_id
        );
}
