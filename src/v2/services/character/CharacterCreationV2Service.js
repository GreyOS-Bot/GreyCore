const unitOfWork =
    require(
        "../../repositories/OperationUnitOfWork"
    );

const guildRepository =
    require(
        "../../repositories/GuildRepository"
    );

const userManager =
    require(
        "../../managers/UserV2Manager"
    );

const characterManager =
    require(
        "../../managers/CharacterV2Manager"
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

const characterTypeCatalog =
    require(
        "../../core/character/CharacterTypeCatalog"
    );

class CharacterCreationV2Service {

    create(data) {

        const normalized =
            this.normalize(data);

        return unitOfWork.run(
            normalizedData =>
                this.createInsideTransaction(
                    normalizedData
                ),
            normalized
        );

    }

    normalize(data) {

        const type =
            String(
                data.type || ""
            ).trim();

        if (
            !characterTypeCatalog
                .isSupported(
                    type
                )
        ) {
            throw new Error(
                "Type de personnage invalide."
            );
        }

        const proxyName =
            String(
                data.proxyName || ""
            ).trim();

        if (!proxyName) {
            throw new Error(
                "Le nom du proxy est obligatoire."
            );
        }

        const fullName =
            String(
                data.fullName || ""
            ).trim();

        if (!fullName) {
            throw new Error(
                characterTypeCatalog
                    .usesSimpleCreation(type)
                    ? "Le prénom est obligatoire."
                    : "Le nom complet est obligatoire."
            );
        }

        const rawAge =
            String(data.age || "")
                .trim();

        const age = rawAge
            ? Number(rawAge)
            : null;

        if (
            !characterTypeCatalog
                .usesSimpleCreation(type)
            && age === null
        ) {
            throw new Error(
                "L’âge doit être un nombre compris entre 1 et 150."
            );
        }

        if (
            age !== null
            && (
                !Number.isInteger(age)
                || age <= 0
                || age > 150
            )
        ) {
            throw new Error(
                "L’âge doit être un nombre compris entre 1 et 150."
            );
        }

        const isSimpleCreation =
            characterTypeCatalog
                .usesSimpleCreation(type);

        const nameParts =
            isSimpleCreation
                ? []
                : fullName
                    .split(/\s+/)
                    .filter(Boolean);

        const firstname =
            isSimpleCreation
                ? fullName
                : nameParts.shift();

        return {
            discordUserId:
                String(
                    data.discordUserId
                ),
            guildId:
                String(data.guildId),
            guildName:
                String(
                    data.guildName
                    || data.guildId
                ),
            type,
            proxyName,
            firstname,
            lastname:
                isSimpleCreation
                    ? null
                    : nameParts.join(" ")
                    || null,
            age,
            gang:
                String(
                    data.gang || ""
                ).trim()
                || null,
            story:
                String(
                    data.story || ""
                ).trim()
                || null
        };

    }

    createInsideTransaction(data) {

        guildRepository.ensure(
            data.guildId,
            data.guildName,
            new Date()
                .toISOString()
        );

        const user =
            userManager.getOrCreate(
                data.discordUserId
            );

        const character =
            characterManager.create({
                ownerUserId:
                    user.id,
                proxyName:
                    data.proxyName,
                baseFirstname:
                    data.firstname,
                baseLastname:
                    data.lastname,
                characterType:
                    data.type
            });

        const continuity =
            continuityManager.create({
                characterId:
                    character.id,
                name:
                    data.guildName,
                firstname:
                    data.firstname,
                lastname:
                    data.lastname,
                age:
                    data.age,
                gang:
                    data.gang,
                story:
                    data.story
            });

        const profile =
            profileManager.create({
                continuityId:
                    continuity.id,
                firstname:
                    data.firstname,
                lastname:
                    data.lastname,
                age:
                    data.age,
                gang:
                    data.gang,
                story:
                    data.story
            });

        const phone =
            phoneManager.createPhone({
                continuityId:
                    continuity.id
            });

        const installation =
            installationManager.createDraft({
                continuityId:
                    continuity.id,
                guildId:
                    data.guildId,
                visibility:
                    characterTypeCatalog
                        .getInstallationVisibility(
                            data.type
                        )
            });

        return {
            user,
            character:
                characterManager.getById(
                    character.id
                ),
            continuity,
            profile,
            phone,
            installation
        };

    }

}

module.exports =
    new CharacterCreationV2Service();
