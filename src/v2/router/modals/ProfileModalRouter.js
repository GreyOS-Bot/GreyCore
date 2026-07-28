const {
    submitIdentity,
    submitAlias,
    submitInformation,
    submitStory
} = require(
    "../../interactions/profile/ProfileEditHandler"
);

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function profileModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_profile_alias_submit:"
            )
        ) {
            await submit(
                interaction,
                () => submitAlias(
                    interaction,
                    customId.split(":")[1]
                )
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_profile_story_submit:"
            )
        ) {
            await submit(
                interaction,
                () => submitStory(
                    interaction,
                    customId.split(":")[1]
                )
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_profile_identity_submit:"
            )
        ) {
            await submit(
                interaction,
                () => submitIdentity(
                    interaction,
                    customId.split(":")[1]
                )
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_profile_information_submit:"
            )
        ) {
            await submit(
                interaction,
                () => submitInformation(
                    interaction,
                    customId.split(":")[1]
                )
            );

            return true;
        }

        return false;
    };

async function submit(interaction, handler) {
    try {
        await handler();
    } catch (error) {
        await replyError(
            interaction,
            error.message
            || "Impossible d’envoyer cette modification."
        );
    }
}
