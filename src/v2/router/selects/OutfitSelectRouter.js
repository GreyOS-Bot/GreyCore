const handleOutfitSelectMenus =
    require(
        "../../interactions/outfits/OutfitSelectMenus"
    );

module.exports =
    async function outfitSelectRouter(
        interaction
    ) {
        if (
            !interaction
                .isStringSelectMenu()
        ) {
            return false;
        }

        return Boolean(
            await handleOutfitSelectMenus(
                interaction
            )
        );
    };
