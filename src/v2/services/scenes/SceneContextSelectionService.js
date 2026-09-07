const { randomUUID } = require('node:crypto');
const lifetime = 10 * 60 * 1000;
function createStore() {
    const drafts = new Map();
    return {
        create(data, now = Date.now()) {
            const { guildId, userId } = data;
            if (!guildId || !userId) throw new Error('Une interface doit appartenir à un serveur et un utilisateur.');
            for (const [token, draft] of drafts) if (draft.expiresAt <= now) drafts.delete(token);
            const owned = [...drafts].filter(([, draft]) => draft.guildId === guildId && draft.userId === userId);
            // Bound both each actor and the process; independent windows keep their own Context.
            while (owned.length >= 32) drafts.delete(owned.shift()[0]);
            while (drafts.size >= 4096) drafts.delete(drafts.keys().next().value);
            const token = randomUUID();
            drafts.set(token, { page: 0, ...data, expiresAt: now + lifetime });
            return token;
        },
        get(token, guildId, userId, now = Date.now()) {
            const draft = drafts.get(token);
            if (draft?.expiresAt <= now) drafts.delete(token);
            if (!draft || draft.expiresAt <= now || draft.guildId !== guildId || draft.userId !== userId) return null;
            return { ...draft };
        },
        take(token, guildId, userId, now = Date.now()) {
            const draft = this.get(token, guildId, userId, now);
            if (draft) drafts.delete(token);
            return draft;
        }
    };
}
module.exports = { ...createStore(), createStore };
