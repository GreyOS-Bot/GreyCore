const handler =
    require("./AssetHandler");

async function handleAssetButtons(interaction) {
    const id = interaction.customId;

    if (!id.startsWith("v2_asset_")) {
        return false;
    }

    if (id.startsWith("v2_asset_open:")) {
        await handler.openDetail(
            interaction,
            Number(id.split(":")[1])
        );

        return true;
    }

    if (id.startsWith("v2_asset_add:")) {
        await handler.openTypePicker(
            interaction,
            id.split(":")[1]
        );

        return true;
    }

    if (id.startsWith("v2_asset_types:")) {
        await handler.showTypeManagement(
            interaction,
            id.split(":")[1]
        );

        return true;
    }

    if (id.startsWith("v2_asset_type_add:")) {
        await handler.showTypeModal(
            interaction,
            id.split(":")[1]
        );

        return true;
    }

    if (id.startsWith("v2_asset_edit:")) {
        await handler.showEditModal(
            interaction,
            Number(id.split(":")[1])
        );

        return true;
    }

    if (id.startsWith("v2_asset_transfer:")) {
        await handler.showTransferModal(
            interaction,
            Number(id.split(":")[1])
        );

        return true;
    }

    if (id.startsWith("v2_asset_history:")) {
        await handler.showTransferHistory(
            interaction,
            Number(id.split(":")[1])
        );

        return true;
    }

    if (id.startsWith("v2_asset_delete_confirm:")) {
        await handler.deleteConfirmed(
            interaction,
            Number(id.split(":")[1])
        );

        return true;
    }

    if (id.startsWith("v2_asset_delete:")) {
        await handler.confirmDelete(
            interaction,
            Number(id.split(":")[1])
        );

        return true;
    }

    return false;
}

module.exports = {
    handleAssetButtons
};
