const db = require("../../database/database");

function getById(id) {
    return db.prepare(`
        SELECT p.*, i.character_id, i.status AS installation_status,
               c.is_active AS context_is_active
        FROM InstallationPhonesV2 p
        JOIN CharacterGuildInstallationsV2 i ON i.id = p.installation_id
        JOIN Contexts c ON c.id = p.context_id AND c.guild_id = p.guild_id
        WHERE p.id = ?
    `).get(id);
}

function getByInstallation(installationId) {
    return db.prepare(`
        SELECT p.*, i.character_id, i.status AS installation_status,
               c.is_active AS context_is_active
        FROM InstallationPhonesV2 p
        JOIN CharacterGuildInstallationsV2 i ON i.id = p.installation_id
        JOIN Contexts c ON c.id = p.context_id AND c.guild_id = p.guild_id
        WHERE p.installation_id = ?
    `).get(installationId);
}

function getByNumberInContext(guildId, contextId, phoneNumber) {
    return db.prepare(`
        SELECT p.*, i.character_id, i.status AS installation_status,
               c.is_active AS context_is_active
        FROM InstallationPhonesV2 p
        JOIN CharacterGuildInstallationsV2 i ON i.id = p.installation_id
        JOIN Contexts c ON c.id = p.context_id AND c.guild_id = p.guild_id
        WHERE p.guild_id = ? AND p.context_id = ? AND p.phone_number = ?
    `).get(String(guildId), contextId, phoneNumber);
}

function getLegacyByContinuity(continuityId) {
    return db.prepare(`
        SELECT * FROM ContinuityPhonesV2 WHERE continuity_id = ?
    `).get(continuityId);
}

function getContinuityByPhone(id) {
    return db.prepare(`SELECT c.* FROM CharacterContinuitiesV2 c
        JOIN InstallationPhonesV2 p ON p.continuity_id = c.id WHERE p.id = ?`).get(id);
}

function insert(data) {
    const result = db.prepare(`
        INSERT INTO InstallationPhonesV2 (
            installation_id, guild_id, context_id, continuity_id,
            phone_number, legacy_phone_id, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.installationId, String(data.guildId), data.contextId,
        data.continuityId, data.phoneNumber, data.legacyPhoneId || null,
        data.isActive, data.createdAt, data.updatedAt
    );
    return getById(result.lastInsertRowid);
}

function listLegacyArchiveByContinuity(continuityId) {
    return db.prepare(`
        SELECT p.*, a.reason AS legacy_reason, a.archived_at
        FROM ContinuityPhonesV2 p
        JOIN InstallationPhoneLegacyArchiveV2 a ON a.legacy_phone_id = p.id
        WHERE p.continuity_id = ?
        ORDER BY p.id
    `).all(continuityId);
}

function getLegacyArchive(legacyPhoneId) {
    const phone = db.prepare(`
        SELECT p.*, a.reason AS legacy_reason, a.archived_at
        FROM ContinuityPhonesV2 p
        JOIN InstallationPhoneLegacyArchiveV2 a ON a.legacy_phone_id = p.id
        WHERE p.id = ?
    `).get(legacyPhoneId);
    if (!phone) return null;
    return {
        phone,
        contacts: db.prepare("SELECT * FROM PhoneContactsV2 WHERE phone_id = ? ORDER BY id").all(legacyPhoneId),
        conversations: db.prepare(`SELECT DISTINCT c.* FROM PhoneConversationsV2 c
            LEFT JOIN PhoneConversationParticipantsV2 p ON p.conversation_id = c.id
            WHERE c.owner_phone_id = ? OR c.phone_a_id = ? OR c.phone_b_id = ? OR p.phone_id = ?
            ORDER BY c.id`).all(legacyPhoneId, legacyPhoneId, legacyPhoneId, legacyPhoneId),
        calls: db.prepare(`SELECT * FROM PhoneCallsV2
            WHERE caller_phone_id = ? OR receiver_phone_id = ? ORDER BY id`).all(legacyPhoneId, legacyPhoneId),
        callHistory: db.prepare("SELECT * FROM PhoneCallHistoryV2 WHERE caller_phone_id = ? ORDER BY id").all(legacyPhoneId)
    };
}

module.exports = {
    getById,
    getByInstallation,
    getByNumberInContext,
    getLegacyByContinuity,
    getContinuityByPhone,
    insert,
    listLegacyArchiveByContinuity,
    getLegacyArchive,
    runInTransaction: operation => db.transaction(operation)()
};
