const v2 =
    require("../../index");

const continuityHomeView =
    require(
        "../../views/continuity/ContinuityHomeView"
    );

const deploymentChoiceView =
    require(
        "../../views/deployment/DeploymentChoiceView"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async (interaction) => {
    const continuityId =
        interaction.values[0];

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
        v2.managers.library
            .getCharacterForUser(
                continuity.character_id,
                user.id
            );

    if (!character) {
        return replyError(
            interaction,
            "Cette histoire ne t’appartient pas."
        );
    }

    if (
        interaction.customId.startsWith(
            "v2_continuity_deploy_select:"
        )
    ) {
        const existingInstallation =
            v2.managers.installation
                .getByContinuityAndGuild(
                    continuity.id,
                    interaction.guildId
                );

        return interaction.update(
            deploymentChoiceView.build(
                character,
                continuity,
                {
                    existingInstallation,
                    returnCustomId:
                        `v2_character_deploy:${character.id}`
                }
            )
        );
    }

    const profile =
        v2.managers.profile.get(
            continuity.id
        );

    const installations =
        v2.managers.installation
            .getByContinuity(
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
