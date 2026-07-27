const phoneManager =
    require("../managers/PhoneV2Manager");

const crypto =
    require("crypto");

const db =
    require("../../database/database");

const userManager =
    require("../managers/UserV2Manager");

const characterManager =
    require("../managers/CharacterV2Manager");

const continuityManager =
    require("../managers/ContinuityV2Manager");

const installationManager =
    require("../managers/InstallationV2Manager");

const profileManager =
    require("../managers/ProfileV2Manager");

class MigrationV1ToV2 {
    getMapping(entityType, oldId) {
        return db.prepare(`
            SELECT *
            FROM MigrationV1ToV2
            WHERE entity_type = ?
            AND old_id = ?
        `).get(
            entityType,
            String(oldId)
        );
    }

    saveMapping(
        entityType,
        oldId,
        newId
    ) {
        db.prepare(`
            INSERT INTO MigrationV1ToV2 (
                entity_type,
                old_id,
                new_id,
                migrated_at
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(entity_type, old_id)
            DO UPDATE SET
                new_id = excluded.new_id,
                migrated_at = excluded.migrated_at
        `).run(
            entityType,
            String(oldId),
            String(newId),
            new Date().toISOString()
        );
    }

    generateCharacterId() {
        return `charv2_${crypto.randomUUID()}`;
    }

    generateContinuityId() {
        return `cont_${crypto.randomUUID()}`;
    }

    getV1Characters() {
        return db.prepare(`
            SELECT *
            FROM Characters
            ORDER BY created_at ASC
        `).all();
    }

    getV1Profile(characterId) {
        return db.prepare(`
            SELECT *
            FROM CharacterProfiles
            WHERE character_id = ?
        `).get(characterId);
    }

    getOrCreateUser(ownerDiscordId) {
        const existingMapping =
            this.getMapping(
                "user",
                ownerDiscordId
            );

        if (existingMapping) {
            const existingUser =
                userManager.getById(
                    Number(
                        existingMapping.new_id
                    )
                );

            if (existingUser) {
                return existingUser;
            }
        }

        const user =
            userManager.getOrCreate(
                ownerDiscordId
            );

        this.saveMapping(
            "user",
            ownerDiscordId,
            user.id
        );

        return user;
    }

    migrateCharacter(v1Character) {
    const existingMapping =
        this.getMapping(
            "character",
            v1Character.id
        );

    if (existingMapping) {
        const existingCharacter =
            characterManager.getById(
                existingMapping.new_id
            );

        if (existingCharacter) {
            return existingCharacter;
        }
    }

    const user =
        this.getOrCreateUser(
            v1Character.owner_id
        );

    const v1Profile =
        this.getV1Profile(
            v1Character.id
        );

    /*
     * Un même propriétaire peut avoir créé le même personnage
     * sur plusieurs serveurs dans la V1.
     *
     * En V2, ces anciennes fiches utilisent un seul personnage
     * global, puis possèdent chacune leur propre continuité.
     */
    const existingGlobalCharacter =
        characterManager.getByProxyName(
            user.id,
            v1Character.name
        );

    if (existingGlobalCharacter) {
        this.saveMapping(
            "character",
            v1Character.id,
            existingGlobalCharacter.id
        );

        return existingGlobalCharacter;
    }

    const character =
        characterManager.create({
            id:
                this.generateCharacterId(),

            ownerUserId:
                user.id,

            proxyName:
                v1Character.name,

            avatarUrl:
                v1Character.avatar || null,

            baseFirstname:
                v1Profile?.firstname || null,

            baseLastname:
                v1Profile?.lastname || null,

            isArchived:
                v1Character.is_active === 0,

            createdAt:
                v1Character.created_at ||
                new Date().toISOString(),

            updatedAt:
                v1Character.updated_at ||
                v1Character.created_at ||
                new Date().toISOString()
        });

    this.saveMapping(
        "character",
        v1Character.id,
        character.id
    );

    return character;
}

    getV1GuildName(guildId) {
    try {
        const guild = db.prepare(`
            SELECT *
            FROM Guilds
            WHERE id = ?
        `).get(guildId);

        return (
            guild?.name ||
            guild?.guild_name ||
            guildId
        );
    } catch {
        return guildId;
    }
}

generateUniqueContinuityName(
    characterId,
    preferredName
) {
    let continuityName =
        preferredName;

    let suffix = 2;

    while (
        continuityManager.getByCharacterAndName(
            characterId,
            continuityName
        )
    ) {
        continuityName =
            `${preferredName} ${suffix}`;

        suffix++;
    }

    return continuityName;
}

    migrateContinuity(
    v1Character,
    characterV2
) {
    const existingMapping =
        this.getMapping(
            "continuity",
            v1Character.id
        );

    if (existingMapping) {
        const existingContinuity =
            continuityManager.getById(
                existingMapping.new_id
            );

        if (existingContinuity) {
            return existingContinuity;
        }
    }

    const guildName =
        this.getV1GuildName(
            v1Character.guild_id
        );

    const preferredName =
        `Continuité ${guildName}`;

    const continuityName =
        this.generateUniqueContinuityName(
            characterV2.id,
            preferredName
        );

    const continuity =
        continuityManager.create({
            id:
                this.generateContinuityId(),

            characterId:
                characterV2.id,

            name:
                continuityName,

            mode:
                "original",

            createdAt:
                v1Character.created_at ||
                new Date().toISOString(),

            updatedAt:
                v1Character.updated_at ||
                v1Character.created_at ||
                new Date().toISOString()
        });

    this.saveMapping(
        "continuity",
        v1Character.id,
        continuity.id
    );

    return continuity;
}

    migrateProfile(
        v1Character,
        continuity
    ) {
        const existingMapping =
            this.getMapping(
                "profile",
                v1Character.id
            );

        if (existingMapping) {
            const existingProfile =
                profileManager.get(
                    continuity.id
                );

            if (existingProfile) {
                return existingProfile;
            }
        }

        const v1Profile =
            this.getV1Profile(
                v1Character.id
            );

        if (!v1Profile) {
            return null;
        }

        const profile =
            profileManager.create({
                continuityId:
                    continuity.id,

                firstname:
                    v1Profile.firstname,

                lastname:
                    v1Profile.lastname,

                age:
                    v1Profile.age,

                gang:
                    v1Profile.gang,

                story:
                    v1Profile.story
            });

        this.saveMapping(
            "profile",
            v1Character.id,
            continuity.id
        );

        return profile;
    }

    normalizeInstallationStatus(
        v1Status
    ) {
        switch (v1Status) {
            case "approved":
                return "approved";

            case "rejected":
                return "rejected";

            case "pending":
                return "pending";

            default:
                return "draft";
        }
    }

    migrateInstallation(
        v1Character,
        characterV2,
        continuity
    ) {
        const oldInstallationKey =
            `${v1Character.guild_id}:${v1Character.id}`;

        const existingMapping =
            this.getMapping(
                "installation",
                oldInstallationKey
            );

        if (existingMapping) {
            const existingInstallation =
                installationManager.getById(
                    Number(
                        existingMapping.new_id
                    )
                );

            if (existingInstallation) {
                return existingInstallation;
            }
        }

        const status =
            this.normalizeInstallationStatus(
                v1Character.status
            );

        const installation =
            installationManager.create({
                characterId:
                    characterV2.id,

                continuityId:
                    continuity.id,

                guildId:
                    v1Character.guild_id,

                status,

                visibility:
                    v1Character.visibility ||
                    "private",

                proxyEnabled:
                    status === "approved",

                validatedBy:
                    v1Character.validated_by ||
                    null,

                validatedAt:
                    v1Character.validated_at ||
                    null,

                rejectionReason:
                    v1Character.rejection_reason ||
                    null,

                installedAt:
                    v1Character.created_at ||
                    new Date().toISOString(),

                updatedAt:
                    v1Character.updated_at ||
                    v1Character.created_at ||
                    new Date().toISOString()
            });

        this.saveMapping(
            "installation",
            oldInstallationKey,
            installation.id
        );

        return installation;
    }

    getCounts() {
    const count = tableName =>
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM ${tableName}
        `).get().count;

    return {
        users:
            count("UsersV2"),

        characters:
            count("CharactersV2"),

        continuities:
            count(
                "CharacterContinuitiesV2"
            ),

        profiles:
            count(
                "CharacterProfilesV2"
            ),

        installations:
            count(
                "CharacterGuildInstallationsV2"
            ),

        mappings:
            count(
                "MigrationV1ToV2"
            )
    };
}

createMissingPhones() {
    const continuities =
        db.prepare(`
            SELECT continuity.id
            FROM CharacterContinuitiesV2 continuity

            LEFT JOIN ContinuityPhonesV2 phone
                ON phone.continuity_id =
                    continuity.id

            WHERE phone.id IS NULL
        `).all();

    let created = 0;

    for (const continuity of continuities) {
        phoneManager.createPhone({
            continuityId:
                continuity.id
        });

        created++;
    }

    return {
        found:
            continuities.length,

        created
    };
}

run() {
        const v1Characters =
            this.getV1Characters();

        const before =
            this.getCounts();

        const stats = {
            processed: 0,
            profilesFound: 0,
            profilesMissing: 0,
            errors: []
        };

        const migrateAll =
            db.transaction(() => {
                for (
                    const v1Character
                    of v1Characters
                ) {
                    try {
                        const characterV2 =
                            this.migrateCharacter(
                                v1Character
                            );

                        const continuity =
                            this.migrateContinuity(
                                v1Character,
                                characterV2
                            );

                        const profile =
                            this.migrateProfile(
                                v1Character,
                                continuity
                            );

                        if (profile) {
                            stats.profilesFound++;
                        } else {
                            stats.profilesMissing++;
                        }

                        this.migrateInstallation(
                            v1Character,
                            characterV2,
                            continuity
                        );

                        if (
    !phoneManager.getPhoneByContinuity(
        continuity.id
    )
) {
    phoneManager.createPhone({
        continuityId:
            continuity.id
    });
}

                        stats.processed++;
                    } catch (error) {
                        stats.errors.push({
                            characterId:
                                v1Character.id,

                            characterName:
                                v1Character.name,

                            message:
                                error.message
                        });

                        throw error;
                    }
                }
            });

        migrateAll();

const phones =
    this.createMissingPhones();

        const after =
            this.getCounts();

        return {
            v1Characters:
                v1Characters.length,

            before,
            after,
            phones,
            stats
        };
    }
}

module.exports =
    new MigrationV1ToV2();