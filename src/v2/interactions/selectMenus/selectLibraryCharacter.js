const v2 =
    require("../../index");

const openCharacterDashboardPage =
    require("../../pages/character/OpenCharacterDashboardPage");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async (
    interaction
) => {
    const characterId =
        interaction.values[0];

    const user =
        v2.managers.user.getOrCreate(
            interaction.user.id
        );

    const character =
        v2.managers.library
            .getCharacterForUser(
                characterId,
                user.id
            );

    if (!character) {
        return replyError(
            interaction,
            "Ce personnage est introuvable ou ne t’appartient pas."
        );
    }

    return openCharacterDashboardPage.execute(
        interaction,
        character.id
    );
};
