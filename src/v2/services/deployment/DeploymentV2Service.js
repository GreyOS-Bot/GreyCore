const unitOfWork =
    require(
        "../../repositories/OperationUnitOfWork"
    );

const guildRepository =
    require(
        "../../repositories/GuildRepository"
    );

const repository =
    require(
        "../../repositories/DeploymentRepository"
    );

const continuityManager =
    require(
        "../../managers/ContinuityV2Manager"
    );

const profileManager =
    require(
        "../../managers/ProfileV2Manager"
    );

const phoneManager =
    require(
        "../../managers/PhoneV2Manager"
    );

const installationManager =
    require(
        "../../managers/InstallationV2Manager"
    );

class DeploymentV2Service {

    getOwnedSource(
        sourceContinuityId,
        discordUserId
    ) {

        return repository
            .getOwnedSource(
                sourceContinuityId,
                discordUserId
            );

    }

    normalizeGuild(data) {

        const guildId =
            String(
                data.guildId || ""
            ).trim();

        if (!guildId) {
            throw new Error(
                "Le serveur de destination est obligatoire."
            );
        }

        return {
            guildId,
            guildName:
                String(
                    data.guildName
                    || guildId
                ).trim()
                || guildId
        };

    }

    requireSource(data) {

        const source =
            this.getOwnedSource(
                data.sourceContinuityId,
                data.discordUserId
            );

        if (!source) {
            throw new Error(
                "Cette continuité est introuvable ou ne t’appartient pas."
            );
        }

        if (
            source.is_archived === 1
            || source.character_is_archived ===
                1
        ) {
            throw new Error(
                "Une continuité archivée ne peut pas être installée."
            );
        }

        return source;

    }

    ensureGuild(
        guildId,
        guildName
    ) {

        guildRepository.ensure(
            guildId,
            guildName,
            new Date()
                .toISOString()
        );

    }

    deployExisting(data) {

        const guild =
            this.normalizeGuild(data);

        return unitOfWork.run(
            normalizedData =>
                this
                    .deployExistingInsideTransaction(
                        normalizedData
                    ),
            {
                sourceContinuityId:
                    String(
                        data.sourceContinuityId
                    ),
                discordUserId:
                    String(
                        data.discordUserId
                    ),
                ...guild
            }
        );

    }

    deployExistingInsideTransaction(
        data
    ) {

        const source =
            this.requireSource(data);

        this.ensureGuild(
            data.guildId,
            data.guildName
        );

        const existingInstallation =
            installationManager
                .getByContinuityAndGuild(
                    source.id,
                    data.guildId
                );

        if (existingInstallation) {
            return {
                mode:
                    "continued",
                created:
                    false,
                character:
                    this.getCharacter(
                        source.character_id
                    ),
                continuity:
                    continuityManager.getById(
                        source.id
                    ),
                installation:
                    existingInstallation
            };
        }

        const character =
            this.getCharacter(
                source.character_id
            );

        let installation =
            installationManager.createDraft({
                continuityId:
                    source.id,
                guildId:
                    data.guildId
            });

        if (character.avatar_url) {
            installation =
                installationManager
                    .setLocalAvatar(
                        installation.id,
                        character.avatar_url
                    );
        }

        return {
            mode:
                "continued",
            created:
                true,
            character:
                character,
            continuity:
                continuityManager.getById(
                    source.id
                ),
            installation
        };

    }

    deployReset(data) {

        const guild =
            this.normalizeGuild(data);

        const continuityName =
            String(
                data.continuityName || ""
            ).trim();

        if (!continuityName) {
            throw new Error(
                "Le nom de la nouvelle continuité est obligatoire."
            );
        }

        if (continuityName.length > 80) {
            throw new Error(
                "Le nom de la continuité ne peut pas dépasser 80 caractères."
            );
        }

        return unitOfWork.run(
            normalizedData =>
                this
                    .deployResetInsideTransaction(
                        normalizedData
                    ),
            {
                sourceContinuityId:
                    String(
                        data.sourceContinuityId
                    ),
                discordUserId:
                    String(
                        data.discordUserId
                    ),
                continuityName,
                ...guild
            }
        );

    }

    deployResetInsideTransaction(data) {

        const source =
            this.requireSource(data);

        this.ensureGuild(
            data.guildId,
            data.guildName
        );

        const sourceProfile =
            profileManager.get(
                source.id
            );

        const firstname =
            sourceProfile?.firstname
            || source.firstname
            || source.base_firstname
            || null;

        const lastname =
            sourceProfile?.lastname
            || source.lastname
            || source.base_lastname
            || null;

        const continuity =
            continuityManager.create({
                characterId:
                    source.character_id,
                name:
                    data.continuityName,
                mode:
                    "reset",
                sourceContinuityId:
                    source.id,
                firstname,
                lastname
            });

        const profile =
            profileManager.create({
                continuityId:
                    continuity.id,
                firstname,
                lastname
            });

        const phone =
            phoneManager.createPhone({
                continuityId:
                    continuity.id
            });

        const character =
            this.getCharacter(
                source.character_id
            );

        let installation =
            installationManager.createDraft({
                continuityId:
                    continuity.id,
                guildId:
                    data.guildId
            });

        if (character.avatar_url) {
            installation =
                installationManager
                    .setLocalAvatar(
                        installation.id,
                        character.avatar_url
                    );
        }

        return {
            mode:
                "reset",
            created:
                true,
            character:
                character,
            continuity,
            profile,
            phone,
            installation
        };

    }

    getCharacter(characterId) {

        return repository
            .getCharacter(
                characterId
            );

    }

}

module.exports =
    new DeploymentV2Service();
