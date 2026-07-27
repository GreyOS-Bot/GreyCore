const uploadHandler =
    require(
        "./OutfitUploadHandler"
    );

const managementHandler =
    require(
        "./OutfitManagementHandler"
    );

module.exports = {
    ...uploadHandler,
    ...managementHandler
};
