const { randomUUID } = require("node:crypto");
const repository = require("../repositories/NarrativeEntityRepository");
const triggerCatalog = require("../core/catalogs/NarrativeEntityTriggerCatalog");

class NarrativeEntityV2Manager {
    getByGuild(guildId) { return repository.getByGuild(guildId); }
    getById(guildId, entityId) { return repository.getById(guildId, entityId); }

    create(data) {
        return repository.create({
            id: `entity_${randomUUID()}`,
            guildId: data.guildId,
            createdBy: data.createdBy || null,
            isEnabled: true,
            now: new Date().toISOString(),
            ...this.normalize(data)
        });
    }

    update(data) {
        this.requireEntity(data.guildId, data.entityId);
        return repository.update({
            id: data.entityId,
            guildId: data.guildId,
            now: new Date().toISOString(),
            ...this.normalize(data)
        });
    }

    toggle(guildId, entityId) {
        const entity = this.requireEntity(guildId, entityId);
        return repository.setEnabled(guildId, entityId, !entity.is_enabled, new Date().toISOString());
    }

    setTriggers(guildId, entityId, triggers) {
        this.requireEntity(guildId, entityId);
        const unique = [...new Set(triggers || [])];
        if (unique.some(trigger => !triggerCatalog.has(trigger))) {
            throw new Error("Un déclencheur sélectionné est inconnu.");
        }
        return repository.setTriggers(guildId, entityId, unique, new Date().toISOString());
    }

    delete(guildId, entityId) {
        this.requireEntity(guildId, entityId);
        return repository.delete(guildId, entityId);
    }

    chooseForTrigger(guildId, triggerKey, random = Math.random) {
        if (!triggerCatalog.has(triggerKey)) return null;
        const entities = repository.getEnabledForTrigger(guildId, triggerKey);
        if (!entities.length) return null;
        const entity = entities[Math.floor(random() * entities.length)];
        const messages = repository.getMessages(entity.id, triggerKey);
        if (!messages.length) return null;
        const message = messages[Math.floor(random() * messages.length)];
        return { entity, message, trigger: triggerCatalog.get(triggerKey) };
    }

    normalize(data) {
        const name = String(data.name || "").trim();
        if (!name || name.length > 80) throw new Error("Le nom de l’Entité doit contenir entre 1 et 80 caractères.");
        const avatarUrl = String(data.avatarUrl || "").trim() || null;
        if (avatarUrl) {
            try {
                const url = new URL(avatarUrl);
                if (!["http:", "https:"].includes(url.protocol)) throw new Error();
            } catch { throw new Error("L’avatar doit être une adresse web valide."); }
        }
        const description = String(data.description || "").trim() || null;
        if (description && description.length > 1000) throw new Error("La description ne peut pas dépasser 1000 caractères.");
        const messages = String(data.messagesText || "")
            .split(/\r?\n/).map(content => content.trim()).filter(Boolean)
            .map(content => ({ content }));
        if (!messages.length) throw new Error("Ajoutez au moins un message à l’Entité.");
        if (messages.some(message => message.content.length > 2000)) throw new Error("Chaque message doit contenir au maximum 2000 caractères.");
        return {
            name,
            avatarUrl,
            embedColor: parseColor(data.color),
            description,
            messages,
            triggers: data.triggers || []
        };
    }

    requireEntity(guildId, entityId) {
        const entity = repository.getById(guildId, entityId);
        if (!entity) throw new Error("Cette Entité est introuvable sur ce serveur.");
        return entity;
    }
}

function parseColor(value) {
    const normalized = String(value || "#5865F2").trim().replace(/^#/, "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error("La couleur doit utiliser le format #5865F2.");
    return Number.parseInt(normalized, 16);
}

module.exports = new NarrativeEntityV2Manager();
