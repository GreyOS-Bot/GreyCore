const creationHandler =
    require(
        "./EncounterCreationHandler"
    );

const managementHandler =
    require(
        "./EncounterManagementHandler"
    );

module.exports = {
    ...creationHandler,
    ...managementHandler
};
