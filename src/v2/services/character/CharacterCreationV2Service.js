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

const playedCharacterCreationLimitService =
    require(
        "./PlayedCharacterCreationLimitService"
    );

class CharacterCreationV2Service {

    create(data) {

        const normalized =
            this.normalize(data);

        playedCharacterCreationLimitService
            .assertCanCreate({
                guildId:
                    normalized.guildId,
                discordUserId:
                    normalized.discordUserId,
                characterType:
                    normalized.type
            });

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
            this.normalizeDisplayText(
                data.proxyName
            );

        if (!proxyName) {
            throw new Error(
                "Le nom du proxy est obligatoire."
            );
        }

        const isSimpleCreation =
            characterTypeCatalog
                .usesSimpleCreation(type);

        const fullName =
            this.normalizeDisplayText(
                data.fullName
            );

        const suppliedFirstname =
            this.normalizeDisplayText(
                data.firstname
            );

        const suppliedLastname =
            this.normalizeDisplayText(
                data.lastname
            );

        const alias =
            this.normalizeDisplayText(
                data.alias
            )
            || (
                isSimpleCreation
                    ? null
                    : suppliedFirstname
                    || this.normalizeDisplayText(
                        data.fullName
                    )
                        ?.split(/\s+/)[0]
                    || null
            );

        const providedName =
            fullName ||
            [
                suppliedFirstname,
                suppliedLastname
            ]
                .filter(Boolean)
                .join(" ");

        if (
            isSimpleCreation
            && !providedName
        ) {
            throw new Error(
                "Le pr\u00e9nom est obligatoire."
            );
        }

        if (
            !isSimpleCreation
            && !alias
        ) {
            throw new Error(
                "Le pr\u00e9nom ou l'alias est obligatoire."
            );
        }

        const rawAge =
            String(data.age || "")
                .trim();

        const age = rawAge
            ? Number(rawAge)
            : null;

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

        const legacyNameParts =
            !isSimpleCreation
            && !suppliedFirstname
            && fullName
                ? fullName
                    .split(/\s+/)
                    .filter(Boolean)
                : [];

        const firstname =
            isSimpleCreation
                ? providedName
                : suppliedFirstname
                || legacyNameParts.shift()
                || null;

        const story =
            String(
                data.story || ""
            ).trim()
            || null;

        if (
            type === "personnage_joue"
            && !story
        ) {
            throw new Error(
                "L'histoire est obligatoire pour un personnage jou\u00e9."
            );
        }

        const occupation =
            this.normalizeDisplayText(
                data.occupation
            )
            || null;

        const creationDate =
            this.normalizeDisplayText(
                data.creationDate
            )
            || null;

        const allowedGenders = new Map([
            ["femme", "Femme"],
            ["homme", "Homme"],
            ["non genré", "Non genré"],
            ["non genre", "Non genré"]
        ]);
        const rawGender = this.normalizeDisplayText(data.gender);
        const gender = rawGender
            ? allowedGenders.get(
                rawGender.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr")
            )
            : null;
        if (rawGender && !gender) {
            throw new Error("Choisis Femme, Homme ou Non genré pour terminer la création.");
        }

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
                    : suppliedLastname
                    || legacyNameParts.join(" ")
                    || null,
            age,
            gang:
                this.normalizeOrganization(
                    data.gang
                ),
            birthday:
                this.normalizeDisplayText(
                    data.birthday
                )
                || null,
            occupation,
            creationDate,
            gender,
            alias,
            story
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
                gender:
                    data.gender,
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
                alias:
                    data.alias,
                age:
                    data.age,
                gang:
                    data.gang,
                birthday:
                    data.birthday,
                occupation:
                    data.occupation,
                creation_date:
                    data.creationDate,
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

    normalizeDisplayText(
        value
    ) {
        return String(value || "")
            .normalize("NFC")
            .trim();
    }

    normalizeOrganization(
        value
    ) {
        const organization =
            this.normalizeDisplayText(value);

        return organization.toLocaleLowerCase(
            "fr-FR"
        ) === "sans"
            ? "Sans"
            : organization || null;
    }

}

module.exports =
    new CharacterCreationV2Service();
