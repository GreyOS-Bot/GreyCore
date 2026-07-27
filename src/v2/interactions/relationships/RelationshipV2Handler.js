const creationHandler =
    require(
        "./RelationshipCreationHandler"
    );

const managementHandler =
    require(
        "./RelationshipManagementHandler"
    );

module.exports = {
    ...creationHandler,
    ...managementHandler
};
