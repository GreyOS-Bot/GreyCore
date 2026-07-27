const outfitHandler =
    require(
        "../../interactions/outfits/OutfitV2Handler"
    );

module.exports =
    async function outfitModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        if (
            interaction.customId.startsWith(
                "v2_outfit_add_modal:"
            )
        ) {
            await outfitHandler.saveAddModal(
                interaction,
                interaction.customId
                    .split(":")[1]
            );

            return true;
        }

        if (
            !interaction.customId.startsWith(
                "v2_outfit_edit_modal:"
            )
        ) {
            return false;
        }

        await outfitHandler.saveEditModal(
            interaction,
            Number(
                interaction.customId
                    .split(":")[1]
            )
        );

        return true;
    };
