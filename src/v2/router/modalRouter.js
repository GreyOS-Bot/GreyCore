const modalRouters = [
    require(
        "./modals/CharacterModalRouter"
    ),
    require(
        "./modals/RelationshipModalRouter"
    ),
    require(
        "./modals/OutfitModalRouter"
    ),
    require(
        "./modals/AssetModalRouter"
    ),
    require(
        "./modals/PhoneModalRouter"
    ),
    require(
        "./modals/EncounterModalRouter"
    ),
    require(
        "./modals/ProfileModalRouter"
    ),
    require(
        "./modals/AliasModalRouter"
    ),
    require(
        "./modals/StateModalRouter"
    ),
    require(
        "./modals/ValidationModalRouter"
    ),
    require(
        "./modals/ProxyModalRouter"
    )
];

module.exports =
    async function modalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        for (
            const routeModal
            of modalRouters
        ) {
            if (
                await routeModal(
                    interaction
                )
            ) {
                return true;
            }
        }

        return false;
    };
