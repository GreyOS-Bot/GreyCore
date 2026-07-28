const {
    openIdentity,
    openAlias,
    openInformation,
    openStory
} = require(
    "../../interactions/profile/ProfileEditHandler"
);

const openProfileStory =
    require(
        "../../interactions/buttons/openProfileStory"
    );

module.exports =
    async function profileRouter(
        interaction
    ) {
        if (!interaction.isButton()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_profile_alias_edit:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            await openAlias(
                interaction,
                characterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_profile_identity_edit:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            await openIdentity(
                interaction,
                characterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_profile_information_edit:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            await openInformation(
                interaction,
                characterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_profile_story_view:"
            )
        ) {
            await openProfileStory
                .execute(
                    interaction
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_profile_story_edit:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            await openStory(
                interaction,
                characterId
            );

            return true;
        }

        return false;
    };
