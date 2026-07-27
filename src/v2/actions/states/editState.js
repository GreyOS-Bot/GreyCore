const stateManager =
    require("../../managers/StateV2Manager");

const selectManagedState =
    require("./selectManagedState");

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

function isValidDate(
    value
) {

    if (!value) {
        return true;
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        return false;
    }

    const date =
        new Date(
            `${value}T00:00:00.000Z`
        );

    return (
        !Number.isNaN(
            date.getTime()
        )
        && date
            .toISOString()
            .slice(0, 10) === value
    );

}

class EditState {

    async execute(
        interaction,
        characterId,
        stateId
    ) {

        const dashboardData =
            await getManageableDashboard(
                interaction,
                characterId,
                "Tu ne peux pas modifier les états de ce personnage."
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

        const note =
            interaction.fields
                .getTextInputValue(
                    "note"
                )
                .trim();

        const startedAt =
            interaction.fields
                .getTextInputValue(
                    "started_at"
                )
                .trim();

        if (
            !isValidDate(
                startedAt
            )
        ) {
            return replyError(
                interaction,
                "La date doit respecter le format `AAAA-MM-JJ`."
            );
        }

        stateManager.updateState(
            stateId,
            {
                note:
                    note || null,

                startedAt:
                    startedAt || null
            }
        );

        return selectManagedState.execute(
            interaction,
            characterId,
            stateId
        );

    }

}

module.exports =
    new EditState();
