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
    "le routeur Profil ouvre l’histoire sans faire tomber le bot",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/interactions/profile/ProfileEditHandler.js",
            {
                openIdentity:
                    async (
                        interaction,
                        characterId
                    ) =>
                        calls.push([
                            "identity",
                            characterId
                        ]),
                openAlias:
                    async (
                        interaction,
                        characterId
                    ) =>
                        calls.push([
                            "alias",
                            characterId
                        ]),
                openInformation:
                    async (
                        interaction,
                        characterId
                    ) =>
                        calls.push([
                            "information",
                            characterId
                        ]),
                openStory:
                    async (
                        interaction,
                        characterId
                    ) =>
                        calls.push([
                            "edit",
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
                            "view",
                            interaction.customId
                        ])
            }
        );

        const routerPath =
            require.resolve(
                "../src/v2/router/buttons/ProfileRouter"
            );

        delete require.cache[
            routerPath
        ];

        const router =
            require(
                "../src/v2/router/buttons/ProfileRouter"
            );

        const viewInteraction =
            createInteraction(
                "v2_profile_story_view:character:2"
            );

        assert.equal(
            await router(
                viewInteraction
            ),
            true
        );

        const editInteraction =
            createInteraction(
                "v2_profile_story_edit:character"
            );

        assert.equal(
            await router(
                createInteraction(
                    "v2_profile_identity_edit:character"
                )
            ),
            true
        );

        assert.equal(
            await router(
                createInteraction(
                    "v2_profile_alias_edit:character"
                )
            ),
            true
        );

        assert.equal(
            await router(
                createInteraction(
                    "v2_profile_information_edit:character"
                )
            ),
            true
        );

        assert.equal(
            await router(
                editInteraction
            ),
            true
        );

        assert.deepEqual(
            calls,
            [
                [
                    "view",
                    "v2_profile_story_view:character:2"
                ],
                [
                    "identity",
                    "character"
                ],
                [
                    "alias",
                    "character"
                ],
                [
                    "information",
                    "character"
                ],
                [
                    "edit",
                    "character"
                ]
            ]
        );
    }
);

function createInteraction(
    customId
) {
    return {
        customId,
        isButton:
            () => true
    };
}
