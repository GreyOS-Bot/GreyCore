const UI =
    require("../../framework");

const {
    registerPages
} = require("../../pages");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PageNavigationRouter"
    );

registerPages();

const staffErrorLogService =
    require(
        "../../services/StaffErrorLogService"
    );

module.exports =
    async function pageNavigationRouter(
        interaction
    ) {
        if (
            !interaction.isButton()
            ||
            !interaction.customId.startsWith(
                "page:"
            )
        ) {
            return false;
        }

        const {
            route,
            parameter
        } = UI.router.parse(
            interaction.customId
        );

        const normalizedRoute =
            route.startsWith("page:")
                ? route.slice(5)
                : route;

        const handler =
            UI.router.resolve(route)
            ||
            UI.router.resolve(
                normalizedRoute
            );

        if (!handler) {
            const error =
                new Error(
                    `Route V2 introuvable : ${normalizedRoute}`
                );

            await staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    "Navigation V2",
                error,
                interaction
            });

            logger.error(
                `❌ Route V2 introuvable : ${route}`,
                `(normalisée : ${normalizedRoute})`
            );

            await replyError(
                interaction,
                "Cette page n’est pas encore disponible."
            );

            return true;
        }

        try {
            if (
                typeof handler ===
                "function"
            ) {
                await handler(
                    interaction,
                    parameter
                );

                return true;
            }

            if (
                typeof handler.execute ===
                "function"
            ) {
                await handler.execute(
                    interaction,
                    parameter
                );

                return true;
            }

            throw new Error(
                `La route ${normalizedRoute} ne possède aucune méthode execute().`
            );
        } catch (error) {
            await staffErrorLogService.report({
                guildId:
                    interaction.guildId,
                scope:
                    `Navigation V2 · ${normalizedRoute}`,
                error,
                interaction
            });

            logger.error(
                `❌ Erreur route V2 ${normalizedRoute} :`,
                error
            );

            await replyError(
                interaction,
                "Une erreur est survenue pendant l’ouverture de cette page."
            );

            return true;
        }
    };
