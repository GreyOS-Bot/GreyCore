const v2 =
    require("../../index");

const continuityListView =
    require(
        "../../views/continuity/ContinuityListView"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async (interaction) => {
    const characterId =
        interaction.customId.split(":")[1];

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

    const isDeployment =
        interaction.customId.startsWith(
            "v2_character_deploy:"
        );

    const view =
        continuityListView.build(
            character,
            continuities,
            {
                mode:
                    isDeployment
                        ? "deployment"
                        : "browse"
            }
        );

    return interaction.update(view);
};
