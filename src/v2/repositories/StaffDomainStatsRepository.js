const db = require("../../database/database");

class StaffDomainStatsRepository {
    getPhoneStats(guildId) {
        const phoneFilter = `
            FROM ContinuityPhonesV2 AS phone
            JOIN CharacterGuildInstallationsV2 AS installation
                ON installation.continuity_id = phone.continuity_id
            WHERE installation.guild_id = ?
        `;
        const phones = db.prepare(`
            SELECT
                COUNT(DISTINCT phone.id) AS total,
                COUNT(DISTINCT CASE WHEN phone.is_active = 1 THEN phone.id END) AS active
            ${phoneFilter}
        `).get(guildId);
        const conversations = db.prepare(`
            SELECT
                COUNT(DISTINCT conversation.id) AS total,
                COUNT(DISTINCT CASE WHEN conversation.conversation_type = 'group' THEN conversation.id END) AS groups
            FROM PhoneConversationsV2 AS conversation
            JOIN PhoneConversationParticipantsV2 AS participant
                ON participant.conversation_id = conversation.id
            JOIN ContinuityPhonesV2 AS phone ON phone.id = participant.phone_id
            JOIN CharacterGuildInstallationsV2 AS installation
                ON installation.continuity_id = phone.continuity_id
            WHERE installation.guild_id = ?
        `).get(guildId);
        const messages = db.prepare(`
            SELECT COUNT(DISTINCT message.id) AS total
            FROM PhoneMessagesV2 AS message
            JOIN PhoneConversationsV2 AS conversation ON conversation.id = message.conversation_id
            JOIN PhoneConversationParticipantsV2 AS participant
                ON participant.conversation_id = conversation.id
            JOIN ContinuityPhonesV2 AS phone ON phone.id = participant.phone_id
            JOIN CharacterGuildInstallationsV2 AS installation
                ON installation.continuity_id = phone.continuity_id
            WHERE installation.guild_id = ?
        `).get(guildId);
        const calls = db.prepare(`
            SELECT
                COUNT(DISTINCT call.id) AS total,
                COUNT(DISTINCT CASE WHEN call.status IN ('ringing', 'accepted') THEN call.id END) AS active
            FROM PhoneCallsV2 AS call
            JOIN ContinuityPhonesV2 AS phone
                ON phone.id IN (call.caller_phone_id, call.receiver_phone_id)
            JOIN CharacterGuildInstallationsV2 AS installation
                ON installation.continuity_id = phone.continuity_id
            WHERE installation.guild_id = ?
        `).get(guildId);
        return { phones, conversations, messages, calls };
    }

    getBankStats(guildId) {
        return {
            types: db.prepare(`SELECT COUNT(*) AS total FROM AssetTypesV2 WHERE guild_id = ? AND is_archived = 0`).get(guildId).total,
            assets: db.prepare(`SELECT COUNT(*) AS total FROM ContinuityAssetsV2 WHERE guild_id = ?`).get(guildId).total,
            transfers: db.prepare(`SELECT COUNT(*) AS total FROM ContinuityAssetTransfersV2 WHERE guild_id = ?`).get(guildId).total
        };
    }

    getRelationshipStats(guildId) {
        return {
            types: db.prepare(`SELECT COUNT(*) AS total FROM RelationshipTypes WHERE guild_id = ?`).get(guildId).total,
            relationships: db.prepare(`SELECT COUNT(*) AS total FROM ContinuityRelationshipsV2 WHERE guild_id = ?`).get(guildId).total,
            pending: db.prepare(`
                SELECT COUNT(DISTINCT pending.id) AS total
                FROM PendingContinuityRelationshipsV2 AS pending
                JOIN CharacterGuildInstallationsV2 AS installation
                    ON installation.continuity_id IN (
                        pending.requester_continuity_id,
                        pending.target_continuity_id
                    )
                WHERE installation.guild_id = ? AND pending.status = 'pending'
            `).get(guildId).total
        };
    }
}

module.exports = new StaffDomainStatsRepository();
