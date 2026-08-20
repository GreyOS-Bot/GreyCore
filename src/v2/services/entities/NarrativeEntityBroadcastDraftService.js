class NarrativeEntityBroadcastDraftService {
    constructor() {
        this.drafts = new Map();
    }

    key(guildId, userId) {
        return `${guildId}:${userId}`;
    }

    get(guildId, userId) {
        return this.drafts.get(this.key(guildId, userId)) || {
            entityIds: [],
            channelIds: []
        };
    }

    update(guildId, userId, values) {
        const current = this.get(guildId, userId);
        const draft = {
            ...current,
            ...values,
            entityIds: values.entityIds
                ? [...new Set(values.entityIds)].slice(0, 5)
                : current.entityIds,
            channelIds: values.channelIds
                ? [...new Set(values.channelIds)].slice(0, 10)
                : current.channelIds
        };
        this.drafts.set(this.key(guildId, userId), draft);
        return draft;
    }

    clear(guildId, userId) {
        this.drafts.delete(this.key(guildId, userId));
    }
}

module.exports = new NarrativeEntityBroadcastDraftService();
