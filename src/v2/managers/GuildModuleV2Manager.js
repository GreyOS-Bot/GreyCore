const repository =
    require(
        "../repositories/GuildModuleRepository"
    );

const MODULE_CATALOG = [
    {
        key: "phone",
        label: "Téléphone",
        emoji: "📱",
        description: "SMS, MMS, appels, contacts et conversations de groupe."
    },
    {
        key: "relationships",
        label: "Relations",
        emoji: "❤️",
        description: "Liens entre personnages et demandes de relation."
    },
    {
        key: "encounters",
        label: "Rencontres",
        emoji: "🤝",
        description: "Rencontres et notes RP entre personnages."
    },
    {
        key: "states",
        label: "États",
        emoji: "❤️‍🩹",
        description: "États RP configurés par le staff."
    },
    {
        key: "outfit",
        label: "Tenues",
        emoji: "👕",
        description: "Tenue actuelle et historique visuel du personnage."
    },
    {
        key: "assets",
        label: "Biens",
        emoji: "🎒",
        description: "Véhicules, propriétés, entreprises, animaux et autres biens."
    },
    {
        key: "journal",
        label: "Journal",
        emoji: "📖",
        description: "Journal et chronologie du personnage."
    }
];

class GuildModuleV2Manager {

    getAll(
        guildId
    ) {
        return repository
            .getAll(
                guildId
            );
    }

    get(
        guildId,
        moduleKey
    ) {
        return repository
            .get(
                guildId,
                moduleKey
            );
    }

    ensureDefaults(
        guildId
    ) {
        return repository
            .ensureDefaults(
                guildId,
                MODULE_CATALOG.map(
                    module => module.key
                ),
                new Date()
                    .toISOString()
            );
    }

    isEnabled(
        guildId,
        moduleKey
    ) {
        return this.getConfiguration(guildId)
            .find(
                module => module.key === moduleKey
            )?.isEnabled === true;
    }

    setEnabled(
        guildId,
        moduleKey,
        enabled
    ) {
        if (
            !MODULE_CATALOG.some(
                module => module.key === moduleKey
            )
        ) {
            throw new Error("Module inconnu.");
        }

        return repository
            .setEnabled(
                guildId,
                moduleKey,
                enabled,
                new Date()
                    .toISOString()
            );
    }

    getConfiguration(guildId) {
        const enabledByKey = new Map(
            repository.getAll(guildId).map(
                module => [
                    module.module_key,
                    Number(module.is_enabled) === 1
                ]
            )
        );

        return MODULE_CATALOG.map(module => ({
            ...module,
            isEnabled: enabledByKey.has(module.key)
                ? enabledByKey.get(module.key) === true
                : true
        }));
    }

    getModule(moduleKey) {
        return MODULE_CATALOG.find(
            module => module.key === moduleKey
        ) || null;
    }

}

module.exports =
    new GuildModuleV2Manager();
