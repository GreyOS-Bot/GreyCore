const selectContinuity =
    require(
        "../../interactions/selectMenus/selectContinuity"
    );

const selectLibraryCharacter =
    require(
        "../../interactions/selectMenus/selectLibraryCharacter"
    );

module.exports =
    async function librarySelectRouter(
        interaction
    ) {
        if (
            !interaction
                .isStringSelectMenu()
        ) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_continuity_select:"
            )
            || customId.startsWith(
                "v2_continuity_deploy_select:"
            )
        ) {
            await selectContinuity(
                interaction
            );

            return true;
        }

        if (
            customId ===
                "v2_library_character_select"
        ) {
            await selectLibraryCharacter(
                interaction
            );

            return true;
        }

        return false;
    };
