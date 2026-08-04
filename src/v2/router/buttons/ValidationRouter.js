const requestInstallationValidation =
    require(
        "../../interactions/buttons/requestInstallationValidation"
    );

const validationApprove =
    require(
        "../../interactions/buttons/validationApprove"
    );

const validationReject =
    require(
        "../../interactions/buttons/validationReject"
    );

const openValidationHistory =
    require(
        "../../interactions/buttons/openValidationHistory"
    );

const openValidationStory =
    require(
        "../../interactions/buttons/openValidationStory"
    );

const openRejectedProfileEdit =
    require(
        "../../interactions/buttons/openRejectedProfileEdit"
    );

const sendValidationReminder =
    require(
        "../../interactions/buttons/sendValidationReminder"
    );

const requestCharacterChange =
    require(
        "../../interactions/buttons/requestCharacterChange"
    );

const approveChangeRequest =
    require(
        "../../interactions/buttons/approveChangeRequest"
    );

const rejectChangeRequest =
    require(
        "../../interactions/buttons/rejectChangeRequest"
    );

module.exports =
    async function validationRouter(
        interaction
    ) {

        if (!interaction.isButton()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_validation_request_change:"
            )
        ) {
            await requestCharacterChange(interaction);
            return true;
        }

        if (
            customId.startsWith(
                "v2_validation_remind:"
            )
        ) {
            await sendValidationReminder(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_install_submit:"
            )
        ) {
            await requestInstallationValidation(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_validation_approve:"
            )
        ) {
            await validationApprove(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_validation_reject:"
            )
        ) {
            await validationReject(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_validation_story:"
            )
        ) {
            await openValidationStory.execute(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_validation_history:"
            )
        ) {
            await openValidationHistory(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_rejection_edit:"
            )
        ) {
            await openRejectedProfileEdit(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_change_request_approve:"
            )
        ) {
            await approveChangeRequest(interaction);

            return true;
        }

        if (
            customId.startsWith(
                "v2_change_request_reject:"
            )
        ) {
            await rejectChangeRequest(interaction);

            return true;
        }

        return false;

    };
