const {
    randomUUID
} = require("node:crypto");

class RelationshipModalContextManager {

    constructor() {
        this.contexts = new Map();
    }

    create(context) {
        this.cleanupExpired();

        const contextId =
            randomUUID()
                .replace(/-/g, "")
                .slice(0, 16);

        this.contexts.set(
            contextId,
            {
                ...context,
                createdAt:
                    Date.now()
            }
        );

        return contextId;
    }

    consume(
        contextId,
        {
            userId,
            guildId
        }
    ) {
        this.cleanupExpired();

        const context =
            this.contexts.get(contextId);

        if (!context) {
            throw new Error(
                "Cette demande de relation a expir\u00e9. Recommence la cr\u00e9ation."
            );
        }

        if (
            String(context.userId) !==
            String(userId)
            || (
                guildId
                && String(context.guildId) !==
                    String(guildId)
            )
        ) {
            throw new Error(
                "Cette demande de relation ne t'appartient pas."
            );
        }

        this.contexts.delete(contextId);

        return context;
    }

    cleanupExpired() {
        const now = Date.now();

        for (const [
            contextId,
            context
        ] of this.contexts) {
            if (
                now - context.createdAt >
                5 * 60 * 1000
            ) {
                this.contexts.delete(contextId);
            }
        }
    }

}

module.exports =
    new RelationshipModalContextManager();
