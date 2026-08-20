const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la bibliotheque reconnait ses trois selections",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/interactions/selectMenus/selectContinuity.js",
            async interaction => {
                calls.push(
                    `continuity:${interaction.customId}`
                );
            }
        );

        stubModule(
            "src/v2/interactions/selectMenus/selectLibraryCharacter.js",
            async interaction => {
                calls.push(
                    `character:${interaction.customId}`
                );
            }
        );

        const librarySelectRouter =
            require(
                "../src/v2/router/selects/LibrarySelectRouter"
            );

        const interaction = customId => ({
            customId,
            isStringSelectMenu: () => true
        });

        assert.equal(
            await librarySelectRouter(
                interaction("v2_continuity_select:12")
            ),
            true
        );

        assert.equal(
            await librarySelectRouter(
                interaction("v2_continuity_deploy_select:12")
            ),
            true
        );

        assert.equal(
            await librarySelectRouter(
                interaction("v2_library_character_select")
            ),
            true
        );

        assert.equal(
            await librarySelectRouter(
                interaction("v2_unknown_select")
            ),
            false
        );

        assert.equal(
            await librarySelectRouter({
                isStringSelectMenu: () => false
            }),
            false
        );

        assert.deepEqual(
            calls,
            [
                "continuity:v2_continuity_select:12",
                "continuity:v2_continuity_deploy_select:12",
                "character:v2_library_character_select"
            ]
        );
    }
);
