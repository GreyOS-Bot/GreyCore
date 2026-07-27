const outfitV2Handler =
    require("./OutfitV2Handler");

async function handleOutfitSelectMenus(
    interaction
) {

    // Changer la tenue actuelle

    if (
        interaction.customId.startsWith(
            "v2_outfit_change_select:"
        )
    ) {

        const outfitId =
            Number(interaction.values[0]);

        await outfitV2Handler.setCurrent(
            interaction,
            outfitId
        );

        return true;

    }

    // Gestion des tenues

    if (
        interaction.customId.startsWith(
            "v2_outfit_manage_select:"
        )
    ) {

        const outfitId =
            Number(
                interaction.values[0]
            );

        await outfitV2Handler.openManageView(
            interaction,
            outfitId
        );

        return true;

    }

    return false;

}

module.exports =
    handleOutfitSelectMenus;
