const v2 = require("../../index");

const continuityHomeView =
    require("../../views/continuity/ContinuityHomeView");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async (interaction) => {
    const continuityId =
        interaction.customId.split(":")[1];

    const user =
        v2.managers.user.getOrCreate(
            interaction.user.id
        );

    const continuity =
        v2.managers.continuity.getById(
            continuityId
        );

    if (!continuity) {
        return replyError(
            interaction,
            "Cette histoire est introuvable."
        );
    }

    const character =
        v2.managers.library.getCharacterForUser(
            continuity.character_id,
            user.id
        );

    if (!character) {
        return replyError(
            interaction,
            "Cette histoire ne t’appartient pas."
        );
    }

    const profile =
        v2.managers.profile.get(
            continuity.id
        );

    const installations =
        v2.managers.installation.getByContinuity(
            continuity.id
        );

    const view =
        continuityHomeView.build(
            character,
            continuity,
            profile,
            installations
        );

    return interaction.update(view);
};
