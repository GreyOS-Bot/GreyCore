const v2 =
    require("../../index");

const characterDashboardPage =
    require("../../pages/character/CharacterDashboardPage");

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

    const continuities =
        v2.managers.library
            .getContinuities(
                character.id
            );

    const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const dashboardData =
    characterDashboardManager.getDashboardData(
        character.id,
        {
            continuityId:
                character.continuity_id,

            guildId:
                interaction.guildId
        }
    );

if (!dashboardData) {

    return replyError(
        interaction,
        "Impossible de charger ce personnage."
    );

}

const view =
    characterDashboardPage.build(

        dashboardData.character,

        dashboardData.counts,

        {
            isOwner:
                true,
            modules:
                v2.managers.guildModule
                    .getConfiguration(
                        interaction.guildId
                    )
        }

    );
    return interaction.update(view);
};
