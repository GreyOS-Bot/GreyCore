const handler =
    require("./AssetHandler");

async function handleAssetSelectMenus(interaction) {
    const id = interaction.customId;

    if (id.startsWith("v2_asset_create_type:")) {
        await handler.showCreateModal(
            interaction,
            id.split(":")[1],
            Number(interaction.values[0])
        );

        return true;
    }

    if (id.startsWith("v2_asset_select:")) {
        await handler.openDetail(
            interaction,
            Number(interaction.values[0])
        );

        return true;
    }

    if (id.startsWith("v2_asset_transfer_select:")) {
        await handler.transfer(
            interaction,
            Number(id.split(":")[1]),
            interaction.values[0]
        );

        return true;
    }

    return false;
}

module.exports = {
    handleAssetSelectMenus
};
