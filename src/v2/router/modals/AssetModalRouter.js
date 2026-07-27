const handler =
    require("../../interactions/assets/AssetHandler");

module.exports =
    async function assetModalRouter(interaction) {
        if (
            !interaction.isModalSubmit()
            || !interaction.customId.startsWith("v2_asset_")
        ) {
            return false;
        }

        const id = interaction.customId;
        const parts = id.split(":");

        if (id.startsWith("v2_asset_create_modal:")) {
            await handler.saveCreateModal(
                interaction,
                parts[1],
                Number(parts[2])
            );

            return true;
        }

        if (id.startsWith("v2_asset_edit_modal:")) {
            await handler.saveEditModal(
                interaction,
                Number(parts[1])
            );

            return true;
        }

        if (id.startsWith("v2_asset_transfer_modal:")) {
            await handler.findTransferCandidates(
                interaction,
                Number(parts[1])
            );

            return true;
        }

        if (id.startsWith("v2_asset_type_modal:")) {
            await handler.saveTypeModal(
                interaction,
                parts[1]
            );

            return true;
        }

        return false;
    };
