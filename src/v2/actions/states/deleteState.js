const stateManager =
    require("../../managers/StateV2Manager");

const characterStatesPage =
    require("../../pages/character/CharacterStatesPage");

const {
    getInstallationId,
    getInstallationScope,
    getManageableDashboard
} =
    require(
        "../../interactions/states/StateAccessService"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

class DeleteState {

    async execute(
        interaction,
        characterId,
        stateId,
        installationId
    ) {

        const dashboardData =
            await getManageableDashboard(
                interaction,
                characterId,
                "Tu ne peux pas supprimer les états de ce personnage.",
                installationId
            );

        if (!dashboardData) {
            return;
        }

        const {
            character,
            continuity
        } = dashboardData;

        installationId = getInstallationId(dashboardData);

        const state =
            stateManager
                .getActiveStates(
                    installationId
                )
                .find(currentState =>
                    String(
                        currentState.state_id
                        || currentState.id
                    ) === String(stateId)
                );

        if (!state) {
            return replyError(
                interaction,
                "Cet état est introuvable."
            );
        }

        stateManager.deleteState(
            stateId,
            getInstallationScope(dashboardData, interaction.user.id)
        );

        return characterStatesPage.execute(
            interaction,
            characterId,
            installationId
        );

    }

}

module.exports =
    new DeleteState();
