const installationManager =
    require(
        "../v2/managers/InstallationV2Manager"
    );

const database =
    require("../database/database");

function getPlayableCharactersForGuild(
    guildId
) {
    return installationManager
        .getPlayableCharactersForGuild(
            guildId
        );
}

function getDatabasePath() {
    return database.databasePath;
}

module.exports = {
    getPlayableCharactersForGuild,
    getDatabasePath
};
