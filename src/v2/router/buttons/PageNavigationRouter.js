const UI =
    require("../../framework");

const {
    registerPages
} = require("../../pages");

const {
    editOrReplyError
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

const fastInteractionAcknowledgementService =
    require(
        "../../core/services/FastInteractionAcknowledgementService"
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

            await editOrReplyError(
                interaction,
                "Cette page n’est pas encore disponible."
            );

            return true;
        }

        try {
            await fastInteractionAcknowledgementService
                .deferComponentUpdate(
                    interaction
                );
        } catch (error) {
            await reportNavigationError(
                interaction,
                normalizedRoute,
                error
            );

            return true;
        }

        const pageInteraction =
            createDeferredPageInteraction(
                interaction
            );

        try {
            if (
                typeof handler ===
                "function"
            ) {
                await handler(
                    pageInteraction,
                    parameter
                );

                return true;
            }

            if (
                typeof handler.execute ===
                "function"
            ) {
                await handler.execute(
                    pageInteraction,
                    parameter
                );

                return true;
            }

            throw new Error(
                `La route ${normalizedRoute} ne possède aucune méthode execute().`
            );
        } catch (error) {
            await reportNavigationError(
                interaction,
                normalizedRoute,
                error
            );

            await editOrReplyError(
                interaction,
                "Une erreur est survenue pendant l’ouverture de cette page."
            ).catch(replyFailure =>
                logger.warn(
                    "Impossible d’afficher l’erreur de navigation :",
                    replyFailure
                )
            );

            return true;
        }
    };

function createDeferredPageInteraction(
    interaction
) {
    return new Proxy(
        interaction,
        {
            get(target, property) {
                if (property === "update") {
                    return payload =>
                        target.editReply(payload);
                }

                const value = Reflect.get(
                    target,
                    property,
                    target
                );

                return typeof value === "function"
                    ? value.bind(target)
                    : value;
            }
        }
    );
}

async function reportNavigationError(
    interaction,
    normalizedRoute,
    error
) {
    await staffErrorLogService.report({
        guildId: interaction.guildId,
        scope:
            `Navigation V2 · ${normalizedRoute}`,
        error,
        interaction
    });

    logger.error(
        `❌ Erreur route V2 ${normalizedRoute} :`,
        error
    );
}
