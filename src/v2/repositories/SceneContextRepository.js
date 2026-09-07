const ContextRepository = require('./ContextRepository');
const ContextService = require('../services/contexts/ContextService');
const ContextResolutionService = require('../services/contexts/ContextResolutionService');

// Shared data boundary; this deliberately grants no Discord/staff authority.
class SceneContextRepository {
    constructor(db) {
        this.contexts = new ContextService(new ContextRepository(db));
        this.resolution = new ContextResolutionService(this.contexts);
    }
    resolve(guildId, contextId = null, { write = false } = {}) {
        if (!write && contextId !== null) return this.contexts.required(guildId, contextId);
        return this.resolution.resolve({ guildId, contextId });
    }
    matches(row, { guildId, contextId = null, write = false }) {
        const context = this.resolve(guildId, contextId, { write });
        return Boolean(row && row.guild_id === guildId && row.context_id === context.id);
    }
    require(row, scope = null) {
        if (!row) throw new Error('Scène introuvable.');
        if (!this.matches(row, { guildId: row.guild_id, ...scope, write: true })) {
            throw new Error('Cette scène ne correspond pas au contexte demandé.');
        }
        return row;
    }
}
module.exports = SceneContextRepository;
