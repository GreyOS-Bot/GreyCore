const v2 =
    require("../../index");

const deploymentChoiceView =
    require("../../views/deployment/DeploymentChoiceView");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async (interaction) => {

    if (!interaction.guild) {
        return replyError(
            interaction,
            "L’installation doit être lancée depuis le serveur de destination."
        );
    }

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
            "Histoire introuvable."
        );
    }

    const character =
        v2.managers.library
            .getCharacterForUser(
                continuity.character_id,
                user.id
            );

    if (!character) {
        return replyError(
            interaction,
            "Personnage introuvable."
        );
    }

    const existingInstallation =
        v2.managers.installation
            .getByContinuityAndGuild(
                continuity.id,
                interaction.guild.id
            );

    return interaction.update(
        deploymentChoiceView.build(
            character,
            continuity,
            {
                existingInstallation
            }
        )

    );

};
