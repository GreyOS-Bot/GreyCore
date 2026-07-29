const userManager =
    require("./managers/UserV2Manager");

const characterManager =
    require("./managers/CharacterV2Manager");

const continuityManager =
    require("./managers/ContinuityV2Manager");

const installationManager =
    require("./managers/InstallationV2Manager");

const profileManager =
    require("./managers/ProfileV2Manager");

const relationshipManager =
    require("./managers/RelationshipV2Manager");

const stateManager =
    require("./managers/StateV2Manager");

const encounterManager =
    require("./managers/EncounterV2Manager");

const phoneManager =
    require("./managers/PhoneV2Manager");

const outfitManager =
    require("./managers/OutfitV2Manager");

const assetManager =
    require("./managers/AssetV2Manager");

const assetTypeManager =
    require("./managers/AssetTypeV2Manager");

const guildModuleManager =
    require("./managers/GuildModuleV2Manager");

const installationMessageManager =
    require(
        "./managers/InstallationMessageV2Manager"
    );

const libraryManager =
    require("./managers/LibraryManager");

const guildSettingsManager =
    require(
        "./managers/GuildSettingsV2Manager"
    );

const validationManager =
    require(
        "./services/validation/ValidationManagerV2"
    );

const changeRequestManager =
    require(
        "./managers/CharacterChangeRequestV2Manager"
    );

const characterApprovalAutomationManager =
    require(
        "./managers/CharacterApprovalAutomationV2Manager"
    );

const validationCardBuilder =
    require(
        "./builders/ValidationCardBuilder"
    );

const core =
    require("./core");

const managers = {
    user:
        userManager,

    character:
        characterManager,

    continuity:
        continuityManager,

    installation:
        installationManager,

    profile:
        profileManager,

    relationship:
        relationshipManager,

    state:
        stateManager,

    encounter:
        encounterManager,

    phone:
        phoneManager,

    outfit:
        outfitManager,

    asset:
        assetManager,

    assetType:
        assetTypeManager,

    guildModule:
        guildModuleManager,

    installationMessage:
        installationMessageManager,

    library:
        libraryManager,

    guildSettings:
        guildSettingsManager,

    validation:
        validationManager,

    changeRequest:
        changeRequestManager,

    characterApprovalAutomation:
        characterApprovalAutomationManager
};

const builders = {
    validationCard:
        validationCardBuilder,

    changeRequestCard:
        require(
            "./builders/CharacterChangeRequestCardBuilder"
        )
};

core.services.installationContext.initialize(
    managers
);

module.exports = {
    core,
    managers,
    builders
};
