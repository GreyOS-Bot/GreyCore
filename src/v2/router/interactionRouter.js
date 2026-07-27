const interactionRouters = [
    require("./autocompleteRouter"),
    require("./commandRouter"),
    require("./modalRouter"),
    require("./selectRouter"),
    require("./buttonRouter")
];

module.exports =
    async function interactionRouter(
        interaction
    ) {
        for (
            const routeInteraction
            of interactionRouters
        ) {
            if (
                await routeInteraction(
                    interaction
                )
            ) {
                return true;
            }
        }

        return false;
    };
