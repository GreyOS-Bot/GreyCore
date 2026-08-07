const drafts = new Map();
const TTL_MS = 30 * 60 * 1000;

class StaffPermissionDraftService {
    key(guildId, userId, subjectType) {
        return `${guildId}:${userId}:${subjectType}`;
    }

    start(guildId, userId, subjectType, subjectIds) {
        const draft = {
            guildId: String(guildId),
            userId: String(userId),
            subjectType,
            subjectIds: [...new Set(subjectIds.map(String))],
            expiresAt: Date.now() + TTL_MS
        };
        drafts.set(this.key(guildId, userId, subjectType), draft);
        return draft;
    }

    get(guildId, userId, subjectType) {
        const key = this.key(guildId, userId, subjectType);
        const draft = drafts.get(key);
        if (!draft || draft.expiresAt < Date.now()) {
            drafts.delete(key);
            return null;
        }
        return draft;
    }

    clear(guildId, userId, subjectType) {
        drafts.delete(this.key(guildId, userId, subjectType));
    }
}

module.exports = new StaffPermissionDraftService();
