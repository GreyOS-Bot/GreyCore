const { randomUUID } = require('node:crypto');

class ContextService {
    constructor(repository) { this.repository = repository; }
    guild(guildId) {
        if (typeof guildId !== 'string' || !guildId.trim()
            || !this.repository.guildExists(guildId)) throw new Error('Guild introuvable.');
    }
    required(guildId, id) {
        this.guild(guildId);
        const row = this.repository.getById(guildId, id);
        if (!row) throw new Error('Contexte introuvable dans cette Guild.');
        return row;
    }
    validate(guildId, row) {
        if (typeof row.key !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(row.key)) {
            throw new Error('Clé invalide : 1 à 64 lettres minuscules, chiffres, tirets ou underscores.');
        }
        if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 100
            || typeof row.description !== 'string' || row.description.length > 1000) {
            throw new Error('Nom ou description invalide.');
        }
        const duplicate = this.repository.getByKey(guildId, row.key);
        if (duplicate && duplicate.id !== row.id) throw new Error('Cette clé existe déjà dans cette Guild.');
        const seen = new Set([row.id]);
        let parentId = row.parent_context_id;
        while (parentId !== null) {
            if (seen.has(parentId)) throw new Error('Cycle de Contexts interdit.');
            seen.add(parentId);
            const parent = this.required(guildId, parentId);
            if (!parent.is_active) throw new Error('Le parent doit être actif.');
            parentId = parent.parent_context_id;
        }
    }
    create({ guildId, key, name, description = '', parentContextId = null, createdBy = null }) {
        return this.repository.transaction(() => {
            this.guild(guildId);
            const now = new Date().toISOString();
            const row = {
                id: randomUUID(), guild_id: guildId, key, name, description,
                parent_context_id: parentContextId, created_by: createdBy,
                is_active: 1, is_default: this.repository.getDefault(guildId) ? 0 : 1,
                created_at: now, updated_at: now
            };
            this.validate(guildId, row);
            return this.repository.create(row);
        });
    }
    update(guildId, id, changes) {
        return this.repository.transaction(() => {
            const row = this.required(guildId, id);
            for (const field of ['key', 'name', 'description', 'parent_context_id']) {
                if (Object.hasOwn(changes, field)) row[field] = changes[field];
            }
            this.validate(guildId, row);
            row.updated_at = new Date().toISOString();
            return this.repository.update(guildId, id, row);
        });
    }
    listByGuild(guildId) { this.guild(guildId); return this.repository.listByGuild(guildId); }
    setDefault(guildId, id) {
        return this.repository.transaction(() => {
            const row = this.required(guildId, id);
            if (!row.is_active) throw new Error('Le défaut doit être actif.');
            return this.repository.setDefault(guildId, id, new Date().toISOString());
        });
    }
    ensureDefault(guildId) {
        return this.repository.transaction(() => {
            this.guild(guildId);
            const current = this.repository.getDefault(guildId);
            if (current) return current;
            const existing = this.repository.listByGuild(guildId).find(row => row.is_active);
            if (existing) return this.setDefault(guildId, existing.id);
            let key = 'default';
            for (let index = 1; this.repository.getByKey(guildId, key); index++) key = `default-${index}`;
            return this.create({ guildId, key, name: 'Contexte par défaut' });
        });
    }
    // Root -> child ordering only: no config or permission inheritance in 3A.
    lineage(guildId, id) {
        const rows = [];
        const seen = new Set();
        let row = this.required(guildId, id);
        while (row) {
            if (seen.has(row.id)) throw new Error('Cycle de Contexts interdit.');
            seen.add(row.id);
            rows.unshift(row);
            row = row.parent_context_id === null ? null : this.required(guildId, row.parent_context_id);
        }
        return rows;
    }
}
module.exports = ContextService;
