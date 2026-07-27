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
            !interaction.customId.startsWith(
                "v2_character_create_submit:"
            )
        ) {
            return false;
        }

        await createCharacter(
            interaction
        );

        return true;
    };
