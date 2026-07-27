const {
    handleAssetSelectMenus
} = require(
    "../../interactions/assets/AssetSelectMenus"
);

module.exports =
    async function assetSelectRouter(interaction) {
        if (
            !interaction.isStringSelectMenu()
            || !interaction.customId.startsWith("v2_asset_")
        ) {
            return false;
        }

        return handleAssetSelectMenus(interaction);
    };
