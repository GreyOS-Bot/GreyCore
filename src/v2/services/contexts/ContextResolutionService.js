class ContextResolutionService {
    constructor(contexts) { this.contexts = contexts; }
    resolve({ guildId, contextId = null }) {
        const context = contextId === null
            ? this.contexts.ensureDefault(guildId)
            : this.contexts.required(guildId, contextId);
        if (!context.is_active) throw new Error('Ce contexte est inactif.');
        return context;
    }
}
module.exports = ContextResolutionService;
