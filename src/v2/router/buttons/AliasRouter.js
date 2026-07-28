const aliasHandler =
    require(
        "../../interactions/aliases/AliasInteractionHandler"
    );

module.exports =
    async function aliasRouter(interaction) {
        if (!interaction.isButton()) {
            return false;
        }

        const customId = interaction.customId;

        if (
            customId.startsWith(
                "v2_aliases_open:"
            )
        ) {
            await aliasHandler.open(
                interaction,
                customId.split(":")[1]
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_aliases_add:"
            )
        ) {
            await aliasHandler.openAdd(
                interaction,
                customId.split(":")[1]
            );

            return true;
        }

        return false;
    };
