const installDefaultStateTypes =
    require(
        "../../interactions/buttons/installDefaultStateTypes"
    );

const openStateAdd =
    require(
        "../../interactions/buttons/openStateAdd"
    );

const openEditState =
    require(
        "../../actions/states/openEditState"
    );

const confirmDeleteState =
    require(
        "../../actions/states/confirmDeleteState"
    );

const deleteState =
    require(
        "../../actions/states/deleteState"
    );

const selectManagedState =
    require(
        "../../actions/states/selectManagedState"
    );

const openStateManager =
    require(
        "../../actions/states/openStateManager"
    );

const stateManager =
    require(
        "../../managers/StateTypeV2Manager"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const guildManagementPolicy =
    require(
        "../../core/policies/GuildManagementPolicy"
    );

module.exports =
    async function stateRouter(
        interaction
    ) {
        if (!interaction.isButton()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_state_edit:"
            )
        ) {
            const [
                ,
                characterId,
                stateId
            ] = customId.split(":");

            await openEditState.execute(
                interaction,
                characterId,
                stateId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_state_manage:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            await openStateManager.execute(
                interaction,
                characterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_state_delete_confirm:"
            )
        ) {
            const [
                ,
                characterId,
                stateId
            ] = customId.split(":");

            await deleteState.execute(
                interaction,
                characterId,
                stateId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_state_delete:"
            )
        ) {
            const [
                ,
                characterId,
                stateId
            ] = customId.split(":");

            await confirmDeleteState.execute(
                interaction,
                characterId,
                stateId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_state_manage_open:"
            )
        ) {
            const [
                ,
                characterId,
                stateId
            ] = customId.split(":");

            await selectManagedState.execute(
                interaction,
                characterId,
                stateId
            );

            return true;
        }

        if (
            customId ===
            "v2_state_types_install"
        ) {
            await installDefaultStateTypes(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_state_add:"
            )
        ) {
            await openStateAdd(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "state_type_delete_confirm:"
            )
        ) {
            const stateTypeId =
                Number(
                    customId.split(":")[1]
                );

            const stateType =
                stateManager.getStateTypeById(
                    stateTypeId
                );

            if (
                !stateType
                ||
                stateType.guildId
                    !== interaction.guild.id
            ) {
                await interaction.update({
                    content:
                        "❌ Ce type d’état est introuvable.",
                    components: []
                });

                return true;
            }

            if (
                !guildManagementPolicy
                    .isAdministrator(
                        interaction
                    )
            ) {
                await replyError(
                    interaction,
                    "Seul un administrateur peut supprimer un type d’état."
                );

                return true;
            }

            stateManager.deleteStateType(
                interaction.guild.id,
                stateTypeId
            );

            await interaction.update({
                content:
                    `✅ Le type d’état **${stateType.name}** a été supprimé.`,
                components: []
            });

            return true;
        }

        if (
            customId ===
            "state_type_delete_cancel"
        ) {
            await interaction.update({
                content:
                    "❌ Suppression annulée.",
                components: []
            });

            return true;
        }

        return false;
    };
