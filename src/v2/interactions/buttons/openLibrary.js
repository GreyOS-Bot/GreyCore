const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "openLibrary"
    );

const v2 =
    require("../../index");

const libraryView =
    require("../../views/library/LibraryView");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async (
    interaction,
    page = 1
) => {
    try {
        const user =
            v2.managers.user.getOrCreate(
                interaction.user.id
            );

        const characters =
            v2.managers.library.getCharacters(
                user.id
            );

        const view =
            libraryView.build(
                characters,
                {
                    page
                }
            );

        if (
            interaction.deferred ||
            interaction.replied
        ) {
            return interaction.editReply(
                view
            );
        }

        return interaction.update(
            view
        );
    } catch (error) {
        logger.error(
            "❌ Erreur ouverture bibliothèque V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible d'ouvrir la bibliothèque."
        );
    }
};
