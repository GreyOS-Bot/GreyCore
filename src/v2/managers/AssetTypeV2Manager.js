const repository =
    require("../repositories/AssetTypeRepository");

const DEFAULT_TYPES = [
    {
        key: "vehicle",
        label: "Véhicule",
        emoji: "🚗",
        sortOrder: 10
    },
    {
        key: "property",
        label: "Propriété",
        emoji: "🏠",
        sortOrder: 20
    },
    {
        key: "business",
        label: "Entreprise",
        emoji: "🏢",
        sortOrder: 30
    },
    {
        key: "animal",
        label: "Animal",
        emoji: "🐾",
        sortOrder: 40
    },
    {
        key: "other",
        label: "Autre bien",
        emoji: "🎒",
        sortOrder: 50
    }
];

class AssetTypeV2Manager {

    ensureDefaults(guildId) {
        if (!guildId) {
            throw new Error("Serveur introuvable.");
        }

        return repository.ensureDefaults(
            guildId,
            DEFAULT_TYPES,
            new Date().toISOString()
        );
    }

    getForGuild(guildId) {
        return repository.getForGuild(guildId);
    }

    getById(typeId) {
        return repository.getById(typeId);
    }

    create(data) {
        const guildId = String(data.guildId || "").trim();
        const label = this.normalizeLabel(data.label);
        const typeKey = this.toKey(label);

        if (!guildId) {
            throw new Error("Serveur introuvable.");
        }

        if (repository.getByKey(guildId, typeKey)) {
            throw new Error("Un type de bien porte déjà ce nom.");
        }

        const now = new Date().toISOString();

        return repository.create({
            guildId,
            typeKey,
            label,
            emoji: this.normalizeEmoji(data.emoji),
            sortOrder: 100,
            createdAt: now,
            updatedAt: now
        });
    }

    normalizeLabel(value) {
        const label = String(value || "").trim();

        if (!label) {
            throw new Error("Le nom du type de bien est obligatoire.");
        }

        if (label.length > 60) {
            throw new Error("Le nom du type de bien est trop long.");
        }

        return label;
    }

    normalizeEmoji(value) {
        const emoji = String(value || "").trim();

        return emoji.slice(0, 32) || "🎒";
    }

    toKey(label) {
        const key = label
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLocaleLowerCase("fr-FR")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        if (!key) {
            throw new Error("Le nom du type de bien est invalide.");
        }

        return key.slice(0, 50);
    }
}

module.exports =
    new AssetTypeV2Manager();
