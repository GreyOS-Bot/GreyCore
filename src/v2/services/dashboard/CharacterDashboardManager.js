const repository =
    require(
        "../../repositories/DashboardRepository"
    );

const characterManager =
    require("../../managers/CharacterV2Manager");

const continuityManager =
    require("../../managers/ContinuityV2Manager");

const installationManager =
    require("../../managers/InstallationV2Manager");

const profileManager =
    require("../../managers/ProfileV2Manager");

const relationshipManager =
    require("../../managers/RelationshipV2Manager");

const encounterManager =
    require("../../managers/EncounterV2Manager");

const stateManager =
    require("../../managers/StateV2Manager");

const installationAccessPolicy =
    require(
        "../../core/policies/InstallationAccessPolicy"
    );

const characterTypeCatalog =
    require(
        "../../core/character/CharacterTypeCatalog"
    );

class CharacterDashboardManager {

    /**
     * Retrouve l'identifiant V2 associé
     * à un ancien personnage V1.
     */
    resolveV2CharacterId(
        legacyCharacterId
    ) {

        return repository
            .resolveV2CharacterId(
                legacyCharacterId
            );

    }

    /**
     * Sélectionne la continuité adaptée.
     *
     * Priorités :
     * 1. Continuité explicitement demandée.
     * 2. Continuité installée sur le serveur actuel.
     * 3. Première continuité non archivée.
     * 4. Première continuité disponible.
     */
    getContinuity(
        characterId,
        options = {}
    ) {

        const {
            continuityId = null,
            guildId = null
        } = options;

        if (continuityId) {

            const requestedContinuity =
                continuityManager.getById(
                    continuityId
                );

            if (
                requestedContinuity &&
                requestedContinuity.character_id ===
                    characterId
            ) {

                return requestedContinuity;

            }

        }

        if (guildId) {

            const installations =
                installationManager
                    .getByCharacter(
                        characterId
                    );

            const guildInstallation =
                installations.find(
                    installation =>
                        String(
                            installation.guild_id
                        ) ===
                        String(guildId)
                );

            if (guildInstallation) {

                const installedContinuity =
                    continuityManager.getById(
                        guildInstallation
                            .continuity_id
                    );

                if (installedContinuity) {

                    return installedContinuity;

                }

            }

        }

        const continuities =
            continuityManager.getByCharacter(
                characterId
            );

        return (
            continuities.find(
                continuity =>
                    !continuity.is_archived
            ) ??
            continuities[0] ??
            null
        );

    }

    /**
     * Construit toutes les données nécessaires
     * au Dashboard d'un personnage.
     */
    getDashboardData(
        characterId,
        options = {}
    ) {

        const character =
            characterManager.getById(
                characterId
            );

        if (!character) {

            return null;

        }

        const continuity =
            this.getContinuity(
                character.id,
                options
            );

        if (!continuity) {

            return {
                character: {
                    ...character,

                    continuity_id:
                        null,

                    age:
                        null,

                    organization_name:
                        null,

                    gang_name:
                        null,

                    is_npc:
                        characterTypeCatalog
                            .isNpc(
                                character
                                    .character_type
                            )
                },

                continuity:
                    null,

                profile:
                    null,

                counts:
                    this.getEmptyCounts()
            };

        }

        const profile =
            profileManager.get(
                continuity.id
            );

        const counts =
            this.getCounts(
                continuity.id
            );

        const dashboardCharacter = {

            ...character,

            display_name:
                profile?.alias ??
                profile?.firstname ??
                continuity.firstname ??
                character.base_firstname ??
                character.proxy_name,

            continuity_id:
                continuity.id,

            continuity_name:
                continuity.name,

            base_firstname:
                profile?.firstname ??
                continuity.firstname ??
                character.base_firstname,

            base_lastname:
                profile?.lastname ??
                continuity.lastname ??
                character.base_lastname,

            age:
                profile?.age ??
                continuity.age ??
                null,

            organization_name:
                profile?.gang ??
                continuity.gang ??
                null,

            gang_name:
                profile?.gang ??
                continuity.gang ??
                null,

            story:
                profile?.story ??
                continuity.story ??
                null,

            is_npc:
                characterTypeCatalog
                    .isNpc(
                        character
                            .character_type
                    )

        };

        return {
            character:
                dashboardCharacter,

            continuity,

            profile,

            counts
        };

    }

    /**
     * Retourne le dashboard uniquement lorsque la continuité
     * est validée et jouable sur le serveur demandé.
     */
    getPlayableDashboardData(
        characterId,
        options = {}
    ) {

        const guildId =
            options.guildId || null;

        if (!guildId) {
            return null;
        }

        const character =
            characterManager.getById(
                characterId
            );

        if (
            !character
            || Number(character.is_archived) === 1
        ) {
            return null;
        }

        const installations =
            installationManager
                .getByCharacter(
                    characterId
                );

        const playableInstallation =
            installations.find(
                installation => {

                    if (
                        String(
                            installation.guild_id
                        ) !==
                        String(guildId)
                    ) {
                        return false;
                    }

                    if (
                        options.continuityId
                        &&
                        installation.continuity_id !==
                            options.continuityId
                    ) {
                        return false;
                    }

                    return installationAccessPolicy
                        .isPlayable(
                            installation
                        );

                }
            );

        if (!playableInstallation) {
            return null;
        }

        return this.getDashboardData(
            characterId,
            {
                ...options,
                guildId,
                continuityId:
                    playableInstallation
                        .continuity_id
            }
        );

    }

    /**
     * Retrouve une fiche jouable à partir du nom affiché
     * par un proxy externe sur le même serveur. Le proxy
     * technique, les proxies secondaires et l'identité
     * affichée du personnage sont reconnus.
     *
     * Un nom partagé par plusieurs installations reste
     * volontairement ambigu : aucune fiche n’est choisie.
     */
    getPlayableDashboardByProxyName(
        guildId,
        proxyName
    ) {

        const normalizedProxyName =
            String(proxyName || "")
                .trim()
                .replace(/:$/, "")
                .trim();

        if (!guildId || !normalizedProxyName) {
            return null;
        }

        const references =
            repository
                .getPlayableProxyReferences(
                    guildId,
                    normalizedProxyName
                );

        if (references.length !== 1) {
            return null;
        }

        const reference =
            references[0];

        return this.getPlayableDashboardData(
            reference.character_id,
            {
                guildId,
                continuityId:
                    reference.continuity_id
            }
        );

    }

    /**
     * Version destinée aux anciens messages proxy.
     */
    getDashboardDataFromLegacy(
        legacyCharacterId,
        options = {}
    ) {

        const characterId =
            this.resolveV2CharacterId(
                legacyCharacterId
            );

        if (!characterId) {

            return null;

        }

        return this.getDashboardData(
            characterId,
            options
        );

    }

        /**
     * Récupère les personnages V2 réellement
     * installés sur un serveur.
     */
    getInstalledCharactersForGuild(
        guildId
    ) {

        const installations =
            repository
                .getInstalledCharacterReferences(
                guildId
            );

        return installations
            .map(installation => {

                const character =
                    characterManager.getById(
                        installation.character_id
                    );

                const continuity =
                    continuityManager.getById(
                        installation.continuity_id
                    );

                if (
                    !character
                    || !continuity
                ) {
                    return null;
                }

                return {
                    character,
                    continuity,

                    characterId:
                        character.id,

                    continuityId:
                        continuity.id
                };

            })
            .filter(Boolean);

    }

    /**
     * Recherche les personnages validés et jouables sur un serveur.
     * Le nom du proxy, l'identité globale, l'identité de continuité
     * et le nom de la continuité peuvent être utilisés.
     */
    searchPlayableCharactersForGuild(
        guildId,
        query,
        {
            excludeCharacterId = null,
            limit = 25
        } = {}
    ) {

        const normalizedQuery =
            String(query || "")
                .trim()
                .normalize("NFD")
                .replace(
                    /\p{Diacritic}/gu,
                    ""
                )
                .toLocaleLowerCase("fr-FR");

        if (!normalizedQuery) {
            return [];
        }

        const safeLimit =
            Math.max(
                1,
                Math.min(
                    Number(limit) || 25,
                    25
                )
            );

        const rows =
            repository
                .getSearchableCharacterReferences(
                    guildId,
                    excludeCharacterId
                );

        const seenCharacterIds =
            new Set();

        return rows
            .map(row => {

                if (
                    seenCharacterIds.has(
                        row.character_id
                    )
                ) {
                    return null;
                }

                const character =
                    characterManager.getById(
                        row.character_id
                    );

                const continuity =
                    continuityManager.getById(
                        row.continuity_id
                    );

                if (
                    !character
                    || !continuity
                ) {
                    return null;
                }

                const searchableText =
                    [
                        character.proxy_name,
                        character.base_firstname,
                        character.base_lastname,
                        continuity.firstname,
                        continuity.lastname,
                        continuity.name
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .normalize("NFD")
                        .replace(
                            /\p{Diacritic}/gu,
                            ""
                        )
                        .toLocaleLowerCase(
                            "fr-FR"
                        );

                if (
                    !searchableText.includes(
                        normalizedQuery
                    )
                ) {
                    return null;
                }

                seenCharacterIds.add(
                    row.character_id
                );

                return {
                    character,
                    continuity,
                    characterId:
                        character.id,
                    continuityId:
                        continuity.id
                };

            })
            .filter(Boolean)
            .sort(
                (entryA, entryB) =>
                    String(
                        entryA.character
                            .proxy_name
                        || ""
                    ).localeCompare(
                        String(
                            entryB.character
                                .proxy_name
                            || ""
                        ),
                        "fr",
                        {
                            sensitivity:
                                "base"
                        }
                    )
            )
            .slice(
                0,
                safeLimit
            );

    }

    /**
     * Récupère les compteurs liés
     * à une continuité.
     */
    getCounts(
        continuityId
    ) {

        if (!continuityId) {

            return this.getEmptyCounts();

        }

        return {

            relations:
                relationshipManager
                    .getForContinuity(
                        continuityId
                    )
                    .length,

            encounters:
                encounterManager
                    .getForContinuity(
                        continuityId
                    )
                    .length,

            states:
                stateManager
                    .getActiveStates(
                        continuityId
                    )
                    .length,

            journal:
                0,

            inventory:
                0,

            vehicles:
                0,

            properties:
                0,

            installations:
                installationManager
                    .getByContinuity(
                        continuityId
                    )
                    .length

        };

    }

    getEmptyCounts() {

        return {
            relations: 0,
            encounters: 0,
            states: 0,
            journal: 0,
            inventory: 0,
            vehicles: 0,
            properties: 0,
            installations: 0
        };

    }

}

module.exports =
    new CharacterDashboardManager();
