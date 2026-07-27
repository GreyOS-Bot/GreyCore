const InstallationContext =
    require("../context/InstallationContext");

class InstallationContextService {

    constructor() {

        this.managers = null;

    }

    initialize(
        managers
    ) {

        this.managers = managers;

    }

    build(
        installationId,
        requester = null,
        guild = null
    ) {

        if (!this.managers) {

            throw new Error(
                "InstallationContextService non initialisé."
            );

        }

        const installation =
            this.managers.installation
                .getById(
                    installationId
                );

        if (!installation) {

            throw new Error(
                "Installation introuvable."
            );

        }

        const continuity =
            this.managers.continuity
                .getById(
                    installation.continuity_id
                );

        if (!continuity) {

            throw new Error(
                "Histoire introuvable."
            );

        }

        const character =
    this.managers.character
        .getById(
            continuity.character_id
        );

if (!character) {

    throw new Error(
        "Personnage introuvable."
    );

}

const owner =
    this.managers.user
        .getById(
            character.owner_user_id
        );

        return new InstallationContext({

            installation,

            continuity,

            character,

            owner,

            requester,

            guild,

            avatar:
                installation.local_avatar_url ||
                character.avatar_url

        });

    }

}

module.exports =
    new InstallationContextService();