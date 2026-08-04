const updateRejectedProfile =
    require(
        "../../interactions/modals/updateRejectedProfile"
    );

const createStory =
    require(
        "../../interactions/modals/createStorySubmit"
    );

const rejectValidation =
    require(
        "../../interactions/modals/rejectValidation"
    );

const rejectChangeRequest =
    require(
        "../../interactions/modals/rejectChangeRequest"
    );

const submitCharacterChangeRequest =
    require(
        "../../interactions/modals/submitCharacterChangeRequest"
    );

module.exports =
    async function validationModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_validation_request_change_submit:"
            )
        ) {
            await submitCharacterChangeRequest(interaction);
            return true;
        }

        if (
            customId.startsWith(
                "v2_rejected_profile_submit:"
            )
        ) {
            await updateRejectedProfile(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_story_create_modal:"
            )
        ) {
            await createStory(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_validation_reject_modal:"
            )
        ) {
            await rejectValidation(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_change_request_reject_modal:"
            )
        ) {
            await rejectChangeRequest(interaction);

            return true;
        }

        return false;
    };
