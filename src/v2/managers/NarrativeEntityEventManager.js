const { randomUUID } = require("node:crypto");
const repository = require("../repositories/NarrativeEntityEventRepository");
const entityManager = require("./NarrativeEntityV2Manager");
const { normalizeSchedule } = require("../services/entities/NarrativeEventSchedule");

class NarrativeEntityEventManager {
    getByGuild(guildId) { return repository.getByGuild(guildId); }
    getByEntity(guildId, entityId) { return repository.getByEntity(guildId, entityId); }
    getById(guildId, eventId) { return repository.getById(guildId, eventId); }
    getEnabled() { return repository.getEnabled(); }

    create(data) {
        const entity = entityManager.getById(data.guildId, data.entityId);
        if (!entity) throw new Error("Cette Entité est introuvable.");
        const name = String(data.name || "").trim();
        if (!name || name.length > 100) throw new Error("Le nom de la programmation doit contenir entre 1 et 100 caractères.");
        const messageContent = String(data.messageContent || "").trim() || null;
        if (messageContent && messageContent.length > 2000) throw new Error("Le message ne peut pas dépasser 2000 caractères.");
        const schedule = normalizeSchedule(data);
        return repository.create({
            id: `entityevent_${randomUUID()}`,
            guildId: data.guildId,
            entityId: data.entityId,
            name,
            messageContent,
            actionKey: data.actionKey || "none",
            actionPayload: data.actionPayload ? JSON.stringify(data.actionPayload) : null,
            scopeIds: [...new Set((data.scopeIds || entity.scopes || []).map(String))].slice(0, 25),
            createdBy: data.createdBy || null,
            now: new Date().toISOString(),
            ...schedule
        });
    }

    setScopes(guildId, eventId, scopeIds) {
        this.requireEvent(guildId, eventId);
        return repository.setScopes(guildId, eventId, [...new Set((scopeIds || []).map(String))].slice(0, 25), new Date().toISOString());
    }

    toggle(guildId, eventId) {
        const event = this.requireEvent(guildId, eventId);
        return repository.setEnabled(guildId, eventId, !event.is_enabled, new Date().toISOString());
    }

    delete(guildId, eventId) {
        this.requireEvent(guildId, eventId);
        return repository.delete(guildId, eventId);
    }

    requireEvent(guildId, eventId) {
        const event = repository.getById(guildId, eventId);
        if (!event) throw new Error("Cette programmation est introuvable.");
        return event;
    }
}

module.exports = new NarrativeEntityEventManager();
