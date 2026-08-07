const repository = require("../../repositories/PlayerActivityRepository");

function getActivity(guildId, discordUserId) {
    return {
        installations: repository.getInstallations(guildId, discordUserId),
        relationships: repository.getPendingRelationships(guildId, discordUserId),
        corrections: repository.getPendingCorrections(guildId, discordUserId)
    };
}

module.exports = { getActivity };
