const selectRouters = [
    require(
        "./selects/GuildModuleSelectRouter"
    ),
    require(
        "./selects/OutfitSelectRouter"
    ),
    require(
        "./selects/AssetSelectRouter"
    ),
    require(
        "./selects/EncounterSelectRouter"
    ),
    require(
        "./selects/RelationshipSelectRouter"
    ),
    require(
        "./selects/StateSelectRouter"
    ),
    require(
        "./selects/PhoneSelectRouter"
    ),
    require(
        "./selects/LibrarySelectRouter"
    )
];

module.exports =
    async function selectRouter(
        interaction
    ) {
        if (
            !interaction
                .isStringSelectMenu()
        ) {
            return false;
        }

        for (
            const routeSelect
            of selectRouters
        ) {
            if (
                await routeSelect(
                    interaction
                )
            ) {
                return true;
            }
        }

        return false;
    };
