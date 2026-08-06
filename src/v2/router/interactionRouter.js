const interactionRouters = [
    require("./autocompleteRouter"),
    require("./commandRouter"),
    require("./modalRouter"),
    require("./selectRouter"),
    require("./buttonRouter")
];

const maintenanceModeService =
    require(
        "../services/MaintenanceModeService"
    );

module.exports =
    async function interactionRouter(
        interaction
    ) {
        if (
            await maintenanceModeService
                .blockInteraction(
                    interaction
                )
        ) {
            return true;
        }

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
