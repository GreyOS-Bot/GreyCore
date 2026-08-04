const v2 =
    require(
        "../../index"
    );

const InstallationStatus =
    require(
        "../../core/constants/InstallationStatus"
    );

class RejectedProfileContextService {

    resolve(
        interaction,
        installationId
    ) {
        if (!installationId) {
            return {
                error:
                    "Identifiant d’installation invalide."
            };
        }

        const installation =
            v2.managers.validation
                .getInstallation(
                    installationId
                );

        if (!installation) {
            return {
                error:
                    "Installation introuvable."
            };
        }

        if (
            installation.status !==
            InstallationStatus.REJECTED
            && installation.status !==
                InstallationStatus.SUSPENDED
        ) {
            return {
                error:
                    "Cette fiche n’est plus en attente de correction."
            };
        }

        const continuity =
            v2.managers.continuity
                .getById(
                    installation
                        .continuity_id
                );

        if (!continuity) {
            return {
                error:
                    "Histoire introuvable."
            };
        }

        const user =
            v2.managers.user
                .getOrCreate(
                    interaction.user.id
                );

        const character =
            v2.managers.library
                .getCharacterForUser(
                    continuity
                        .character_id,
                    user.id
                );

        if (!character) {
            return {
                error:
                    "Tu ne peux pas modifier cette fiche."
            };
        }

        return {
            installation,
            continuity,
            character,
            profile:
                v2.managers.profile
                    .get(
                        continuity.id
                    )
        };
    }

}

module.exports =
    new RejectedProfileContextService();
