const createCharacter =
    require(
        "../../interactions/modals/createCharacterV2"
    );

module.exports =
    async function characterModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        if (
            interaction.customId.startsWith(
                "v2_staff_character_identity_submit:"
            )
        ) {
            await require(
                "../../interactions/staff/StaffCharacterCorrectionHandler"
            ).submitIdentity(interaction);
            return true;
        }

        if (
            interaction.customId.startsWith(
                "v2_staff_character_info_submit:"
            )
        ) {
            await require(
                "../../interactions/staff/StaffCharacterCorrectionHandler"
            ).submitInformation(interaction);
            return true;
        }

        if (
            interaction.customId.startsWith(
                "v2_character_create_submit:"
            )
        ) {
            await createCharacter(
                interaction
            );

            return true;
        }

        if (
            interaction.customId.startsWith(
                "v2_character_create_details_submit:"
            )
        ) {
            await createCharacter.complete(
                interaction
            );

            return true;
        }

        return false;
    };
