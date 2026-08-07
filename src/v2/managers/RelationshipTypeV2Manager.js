const repository = require("../repositories/RelationshipTypeRepository");
const defaultTypes = require("../core/catalogs/DefaultRelationshipTypes");

class RelationshipTypeV2Manager {
    getByGuild(guildId) { return repository.getByGuild(guildId); }

    installDefaults(guildId) {
        return repository.installDefaults(String(guildId), defaultTypes);
    }

    create({ guildId, labelAToB, labelBToA, isSymmetric }) {
        const firstLabel = this.normalizeLabel(labelAToB, "Le libellé principal");
        const reverseLabel = isSymmetric
            ? firstLabel
            : this.normalizeLabel(labelBToA, "Le libellé inverse");
        const key = this.toKey(firstLabel);
        if (!key) throw new Error("Le libellé ne permet pas de créer une clé valide.");
        if (repository.getByKey(guildId, key)) {
            throw new Error("Un type de relation portant ce nom existe déjà.");
        }
        return repository.create({
            guildId: String(guildId), key,
            labelAToB: firstLabel, labelBToA: reverseLabel,
            isSymmetric, createdAt: new Date().toISOString()
        });
    }

    normalizeLabel(value, fieldName) {
        const label = String(value || "").trim();
        if (!label) throw new Error(`${fieldName} est obligatoire.`);
        if (label.length > 80) throw new Error(`${fieldName} est trop long.`);
        return label;
    }

    toKey(label) {
        return label.normalize("NFD").replace(/\p{Diacritic}/gu, "")
            .toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "").slice(0, 60);
    }

    delete(guildId, relationshipTypeId) {
        const type = repository.getById(guildId, relationshipTypeId);
        if (!type) throw new Error("Ce type de relation est introuvable.");
        const usages = repository.countUsages(guildId, relationshipTypeId);
        if (usages > 0) {
            throw new Error(`Ce type est encore utilisé ${usages} fois et ne peut pas être supprimé.`);
        }
        repository.delete(guildId, relationshipTypeId);
        return type;
    }
}

module.exports = new RelationshipTypeV2Manager();
