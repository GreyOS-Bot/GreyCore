const phoneCallSpeak =
    require(
        "../../interactions/modals/PhoneCallSpeakV2"
    );

const phoneMessage =
    require(
        "../../interactions/modals/PhoneMessageV2"
    );

const phoneSearch =
    require(
        "../../interactions/modals/PhoneSearchV2"
    );

const phoneGroupName =
    require(
        "../../interactions/modals/PhoneGroupNameV2"
    );

const phoneVoicemail =
    require(
        "../../interactions/modals/PhoneVoicemailV2"
    );

module.exports =
    async function phoneModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_phone_call_speak_modal:"
            )
        ) {
            await phoneCallSpeak.execute(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_phone_voicemail_modal:"
            )
        ) {
            await phoneVoicemail(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_phone_message_modal:"
            )
            || customId.startsWith("v2_phone_email_modal:")
        ) {
            await phoneMessage(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_phone_group_name_modal:"
            )
        ) {
            await phoneGroupName(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_phone_search_modal:"
            )
        ) {
            await phoneSearch(
                interaction
            );

            return true;
        }

        return false;
    };
