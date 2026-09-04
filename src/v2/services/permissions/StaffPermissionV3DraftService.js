const { randomBytes } = require("node:crypto");

const TTL_MS = 30 * 60 * 1000;

class StaffPermissionV3DraftService {
    constructor() {
        this.drafts = new Map();
    }

    start({ guildId, adminUserId, subjectType, subjectId }) {
        if (subjectType !== "role" && subjectType !== "user") {
            throw new Error("Type de sujet de permission invalide.");
        }
        const draft = {
            version: 3,
            token: this.createToken(),
            guildId: String(guildId),
            adminUserId: String(adminUserId),
            subjectType,
            subjectId: String(subjectId),
            permissionKey: null,
            expected: null,
            expiresAt: Date.now() + TTL_MS
        };
        this.drafts.set(draft.token, draft);
        return draft;
    }

    startDefault({ guildId, adminUserId }) {
        const draft = {
            version: 3,
            token: this.createToken(),
            guildId: String(guildId),
            adminUserId: String(adminUserId),
            subjectType: "guild-default",
            subjectId: null,
            permissionKey: null,
            expected: null,
            expiresAt: Date.now() + TTL_MS
        };
        this.drafts.set(draft.token, draft);
        return draft;
    }

    get(token, guildId, adminUserId) {
        const draft = this.drafts.get(String(token));
        if (!draft || draft.version !== 3
            || draft.expiresAt <= Date.now()
            || draft.guildId !== String(guildId)
            || draft.adminUserId !== String(adminUserId)) {
            if (draft?.expiresAt <= Date.now()) this.drafts.delete(String(token));
            return null;
        }
        return draft;
    }

    selectPermission(draft, permissionKey, expected) {
        draft.permissionKey = permissionKey;
        draft.expected = cloneExpected(expected);
        draft.expiresAt = Date.now() + TTL_MS;
        return draft;
    }

    rotate(draft, expected) {
        this.drafts.delete(draft.token);
        draft.token = this.createToken();
        draft.expected = cloneExpected(expected);
        draft.expiresAt = Date.now() + TTL_MS;
        this.drafts.set(draft.token, draft);
        return draft;
    }

    clear(token) {
        this.drafts.delete(String(token));
    }

    createToken() {
        let token;
        do token = randomBytes(9).toString("base64url");
        while (this.drafts.has(token));
        return token;
    }
}

function cloneExpected(expected) {
    return expected?.present ? {
        present: true,
        effect: expected.effect,
        updatedAt: expected.updatedAt
    } : { present: false };
}

module.exports = new StaffPermissionV3DraftService();
