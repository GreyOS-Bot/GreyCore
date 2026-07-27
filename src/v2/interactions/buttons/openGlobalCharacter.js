const v2 =
    require("../../index");

const characterDashboardPage =
    require("../../pages/character/CharacterDashboardPage");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async (
    interaction
) => {

    const characterId =
        interaction.customId.split(":")[1];

    const user =
        v2.managers.user.getOrCreate(
            interaction.user.id
        );

    const ownedCharacter =
        v2.managers.library.getCharacterForUser(
            characterId,
            user.id
        );

    if (!ownedCharacter) {
        return replyError(
            interaction,
            "Ce personnage est introuvable ou ne t’appartient pas."
        );
    }

    const dashboardData =
        characterDashboardManager
            .getDashboardData(
                ownedCharacter.id,
                {
                    continuityId:
                        ownedCharacter.continuity_id,

                    guildId:
                        interaction.guildId
                }
            );

    if (!dashboardData) {
        return replyError(
            interaction,
            "Impossible de charger le Dashboard de ce personnage."
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
