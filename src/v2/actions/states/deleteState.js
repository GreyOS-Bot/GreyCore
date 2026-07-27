const stateManager =
    require("../../managers/StateV2Manager");

const characterStatesPage =
    require("../../pages/character/CharacterStatesPage");

const {
    getContinuityId,
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
        stateId
    ) {

        const dashboardData =
            await getManageableDashboard(
                interaction,
                characterId,
                "Tu ne peux pas supprimer les états de ce personnage."
            );

        if (!dashboardData) {
            return;
        }

        const {
            character,
            continuity
        } = dashboardData;

        const continuityId =
            getContinuityId(
                dashboardData
            );

        const state =
            stateManager
                .getActiveStates(
                    continuityId
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
            stateId
        );

        return characterStatesPage.execute(
            interaction,
            characterId
        );

    }

}

module.exports =
    new DeleteState();
