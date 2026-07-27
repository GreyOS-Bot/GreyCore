const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const stateManager =
    require("../../managers/StateV2Manager");

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

class OpenEditState {

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

        const states =
            stateManager.getActiveStates(
                continuityId
            );

        const state =
            states.find(currentState =>
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

        const noteInput =
            new TextInputBuilder()
                .setCustomId("note")
                .setLabel("Note (facultatif)")
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(false)
                .setMaxLength(1000)
                .setValue(
                    String(
                        state.note
                        || ""
                    ).slice(0, 1000)
                );

        const startedAtInput =
            new TextInputBuilder()
                .setCustomId("started_at")
                .setLabel(
                    "Date de début (facultatif) — AAAA-MM-JJ"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setMaxLength(10)
                .setPlaceholder(
                    "2026-07-21"
                )
                .setValue(
                    state.started_at
                        ? String(
                            state.started_at
                        ).slice(0, 10)
                        : ""
                );

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_state_edit_submit:${characterId}:${stateId}`
                )
                .setTitle(
                    "Modifier l’état"
                )
                .addComponents(

                    new ActionRowBuilder()
                        .addComponents(
                            noteInput
                        ),

                    new ActionRowBuilder()
                        .addComponents(
                            startedAtInput
                        )

                );

        return interaction.showModal(
            modal
        );

    }

}

module.exports =
    new OpenEditState();
