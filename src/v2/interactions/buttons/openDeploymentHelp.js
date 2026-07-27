const v2 =
    require("../../index");

const deploymentHelpView =
    require(
        "../../views/deployment/DeploymentHelpView"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function openDeploymentHelp(
        interaction
    ) {

        if (!interaction.guild) {
            return replyError(
                interaction,
                "Ce guide doit être ouvert depuis le serveur de destination."
            );
        }

        const continuityId =
            interaction.customId
                .split(":")[1];

        const continuity =
            v2.managers.continuity
                .getById(
                    continuityId
                );

        if (!continuity) {
            return replyError(
                interaction,
                "Continuité introuvable."
            );
        }

        const user =
            v2.managers.user.getOrCreate(
                interaction.user.id
            );

        const character =
            v2.managers.library
                .getCharacterForUser(
                    continuity.character_id,
                    user.id
                );

        if (!character) {
            return replyError(
                interaction,
                "Cette continuité ne t’appartient pas."
            );
        }

        return interaction.update(
            deploymentHelpView.build(
                character,
                continuity,
                interaction.guild
            )
        );

    };
