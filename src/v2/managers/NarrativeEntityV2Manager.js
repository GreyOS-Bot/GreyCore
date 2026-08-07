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

    setScopes(guildId, entityId, channelIds) {
        this.requireEntity(guildId, entityId);
        const unique = [...new Set((channelIds || []).map(String))].slice(0, 25);
        return repository.setScopes(guildId, entityId, unique, new Date().toISOString());
    }

    setExpressions(guildId, entityId, expressionsText) {
        this.requireEntity(guildId, entityId);
        const seen = new Set();
        const expressions = String(expressionsText || "")
            .split(/\r?\n/)
            .map(value => value.trim())
            .filter(Boolean)
            .map(value => ({ value, normalized: normalizeText(value) }))
            .filter(expression => {
                if (!expression.normalized || seen.has(expression.normalized)) return false;
                seen.add(expression.normalized);
                return true;
            });
        if (expressions.some(expression => expression.value.length > 80)) {
            throw new Error("Chaque mot ou expression doit contenir au maximum 80 caractères.");
        }
        if (expressions.length > 50) {
            throw new Error("Une Entité peut avoir au maximum 50 mots ou expressions d’appel.");
        }
        return repository.setExpressions(
            guildId,
            entityId,
            expressions,
            new Date().toISOString()
        );
    }

    delete(guildId, entityId) {
        this.requireEntity(guildId, entityId);
        return repository.delete(guildId, entityId);
    }

    chooseForTrigger(guildId, triggerKey, options = {}) {
        if (!triggerCatalog.has(triggerKey)) return null;
        const normalized = typeof options === "function"
            ? { random: options }
            : options;
        const random = normalized.random || Math.random;
        const channelIds = new Set([
            normalized.channelId,
            normalized.parentId
        ].filter(Boolean).map(String));
        const entities = repository.getEnabledForTrigger(guildId, triggerKey)
            .filter(entity =>
                !channelIds.size
                || !entity.scopes.length
                || entity.scopes.some(scope => channelIds.has(String(scope)))
            );
        if (!entities.length) return null;
        const entity = entities[Math.floor(random() * entities.length)];
        const messages = repository.getMessages(entity.id, triggerKey);
        if (!messages.length) return null;
        const message = messages[Math.floor(random() * messages.length)];
        return { entity, message, trigger: triggerCatalog.get(triggerKey) };
    }

    chooseForInvocation(guildId, content, options = {}) {
        const normalizedContent = normalizeText(content);
        if (!normalizedContent) return null;
        const channelIds = new Set([
            options.channelId,
            options.parentId
        ].filter(Boolean).map(String));
        const words = new Set(normalizedContent.split(/[^a-z0-9]+/).filter(Boolean));
        const candidates = repository.getByGuild(guildId).filter(entity => {
            if (!entity.is_enabled) return false;
            if (
                channelIds.size
                && entity.scopes.length
                && !entity.scopes.some(scope => channelIds.has(String(scope)))
            ) return false;
            const calls = [
                normalizeText(entity.name),
                ...entity.expressions.map(expression => expression.normalized_expression)
            ].filter(Boolean);
            return calls.some(call =>
                call.includes(" ")
                    ? normalizedContent.includes(call)
                    : words.has(call)
            );
        });
        if (!candidates.length) return null;
        const random = options.random || Math.random;
        const entity = candidates[Math.floor(random() * candidates.length)];
        const messages = repository.getMessages(entity.id, null);
        if (!messages.length) return null;
        return {
            entity,
            message: messages[Math.floor(random() * messages.length)]
        };
    }

    claimForumWelcome(guildId, channelId, parentId, random = Math.random) {
        if (!channelId || !parentId) return null;
        const candidates = repository
            .getEnabledForTrigger(guildId, "scene_nsfw")
            .filter(entity =>
                entity.scopes.includes(String(parentId))
                || entity.scopes.includes(String(channelId))
            );
        if (!candidates.length) return null;
        const entity = candidates[Math.floor(random() * candidates.length)];
        const messages = repository.getMessages(entity.id, "scene_nsfw");
        if (!messages.length) return null;
        const claimed = repository.claimChannelWelcome(
            entity.id,
            String(channelId),
            new Date().toISOString()
        );
        if (!claimed) return null;
        return {
            entity,
            message: messages[Math.floor(random() * messages.length)]
        };
    }

    releaseForumWelcome(entityId, channelId) {
        repository.releaseChannelWelcome(entityId, String(channelId));
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

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase("fr-FR")
        .replace(/\s+/g, " ")
        .trim();
}
