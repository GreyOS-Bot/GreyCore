const repository =
    require(
        "../../repositories/UserPrivacyRepository"
    );

class UserPrivacyService {

    constructor(privacyRepository = repository) {
        this.repository =
            privacyRepository;
    }

    getSummary(discordUserId) {
        return this.repository.getSummary(
            discordUserId
        );
    }

    erase(discordUserId) {
        return this.repository.erase(
            discordUserId
        );
    }

}

const service = new UserPrivacyService();

module.exports = service;
module.exports.UserPrivacyService =
    UserPrivacyService;
