class ApprovalAutomationDraftService {
    constructor() {
        this.drafts = new Map();
        this.ttlMs = 30 * 60 * 1000;
    }

    key(guildId, userId) { return `${guildId}:${userId}`; }

    start(guildId, userId, configuration = null) {
        const draft = {
            requiredRoleId: configuration?.required_role_id || null,
            removeRoleId: configuration?.remove_role_id || null,
            addRoleId: configuration?.add_role_id || null,
            welcomeChannelId: configuration?.welcome_channel_id || null,
            approvedCharacterCount: Number(configuration?.approved_character_count || 2),
            welcomeMessage: configuration?.welcome_message || "",
            expiresAt: Date.now() + this.ttlMs
        };
        this.drafts.set(this.key(guildId, userId), draft);
        return draft;
    }

    get(guildId, userId) {
        const key = this.key(guildId, userId);
        const draft = this.drafts.get(key);
        if (!draft || draft.expiresAt < Date.now()) {
            this.drafts.delete(key);
            return null;
        }
        return draft;
    }

    update(guildId, userId, changes) {
        const draft = this.get(guildId, userId) || this.start(guildId, userId);
        Object.assign(draft, changes, { expiresAt: Date.now() + this.ttlMs });
        return draft;
    }

    clear(guildId, userId) { this.drafts.delete(this.key(guildId, userId)); }
}

module.exports = new ApprovalAutomationDraftService();
