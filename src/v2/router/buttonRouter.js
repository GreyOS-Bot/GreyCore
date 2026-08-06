const buttonRouters = [
    require("./buttons/SceneRouter"),
    require(
        "./buttons/PageNavigationRouter"
    ),
    require(
        "./buttons/EncounterRouter"
    ),
    require(
        "./buttons/RelationshipRouter"
    ),
    require(
        "./buttons/StateRouter"
    ),
    require(
        "./buttons/ProfileRouter"
    ),
    require(
        "./buttons/AliasRouter"
    ),
    require(
        "./buttons/PhoneRouter"
    ),
    require(
        "./buttons/ValidationRouter"
    ),
    require(
        "./buttons/LibraryRouter"
    ),
    require(
        "./buttons/OutfitRouter"
    ),
    require(
        "./buttons/AssetRouter"
    ),
    require(
        "./buttons/CharacterRouter"
    )
];

module.exports =
    async function buttonRouter(
        interaction,
        dependencies = {}
    ) {
        if (!interaction.isButton()) {
            return false;
        }

        for (
            const routeButton
            of buttonRouters
        ) {
            if (
                await routeButton(
                    interaction,
                    dependencies
                )
            ) {
                return true;
            }
        }

        return false;
    };
