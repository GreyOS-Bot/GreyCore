const db = require("../../database/database");

function getContext(contextId, guildId) {
    return db.prepare("SELECT * FROM Contexts WHERE id = ? AND guild_id = ?")
        .get(contextId, String(guildId));
}

function getContact(id) {
    return db.prepare("SELECT * FROM InstallationPhoneContactsV2 WHERE id = ?").get(id);
}

function getContacts(phoneId) {
    return db.prepare(`
        SELECT c.*, linked.installation_id AS linked_installation_id
        FROM InstallationPhoneContactsV2 c
        LEFT JOIN InstallationPhonesV2 linked ON linked.id = c.linked_phone_id
        WHERE c.phone_id = ? ORDER BY c.favorite DESC, c.pinned DESC, c.display_name COLLATE NOCASE
    `).all(phoneId);
}

function getContactByLinkedPhone(phoneId, linkedPhoneId) {
    return db.prepare(`SELECT * FROM InstallationPhoneContactsV2
        WHERE phone_id = ? AND linked_phone_id = ?`).get(phoneId, linkedPhoneId);
}

function getExternalContact(phoneId, displayName, phoneNumber) {
    return db.prepare(`SELECT * FROM InstallationPhoneContactsV2
        WHERE phone_id=? AND linked_phone_id IS NULL AND LOWER(display_name)=LOWER(?)
          AND COALESCE(phone_number,'')=COALESCE(?,'')`).get(phoneId, displayName, phoneNumber || null);
}

function insertContact(data) {
    return db.prepare(`
        INSERT INTO InstallationPhoneContactsV2 (
            phone_id, linked_phone_id, contact_type, display_name, phone_number,
            favorite, pinned, blocked, interaction_count, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(data.phoneId, data.linkedPhoneId || null, data.contactType || "greycore",
        data.displayName, data.phoneNumber || null, data.favorite ? 1 : 0,
        data.pinned ? 1 : 0, data.blocked ? 1 : 0, data.notes || null,
        data.createdAt, data.createdAt).lastInsertRowid;
}

function deleteContact(id) {
    return db.prepare("DELETE FROM InstallationPhoneContactsV2 WHERE id = ?").run(id).changes;
}

function updateContact(id, data, updatedAt) {
    const current = getContact(id);
    if (!current) return null;
    db.prepare(`UPDATE InstallationPhoneContactsV2 SET display_name=?, phone_number=?, favorite=?,
        pinned=?, blocked=?, notes=?, updated_at=? WHERE id=?`).run(
        data.displayName ?? current.display_name, data.phoneNumber ?? current.phone_number,
        data.favorite == null ? current.favorite : (data.favorite ? 1 : 0),
        data.pinned == null ? current.pinned : (data.pinned ? 1 : 0),
        data.blocked == null ? current.blocked : (data.blocked ? 1 : 0),
        data.notes ?? current.notes, updatedAt, id
    );
    return getContact(id);
}

function registerContactInteraction(id, occurredAt) {
    db.prepare(`UPDATE InstallationPhoneContactsV2 SET interaction_count=interaction_count+1,
        last_interaction_at=?, updated_at=? WHERE id=?`).run(occurredAt, occurredAt, id);
    return getContact(id);
}

function getConversation(id) {
    return db.prepare("SELECT * FROM InstallationPhoneConversationsV2 WHERE id = ?").get(id);
}

function getConversationParticipant(conversationId, phoneId) {
    return db.prepare(`SELECT * FROM InstallationPhoneConversationParticipantsV2
        WHERE conversation_id = ? AND phone_id = ? AND has_left = 0`).get(conversationId, phoneId);
}

function getConversationParticipants(conversationId) {
    return db.prepare(`
        SELECT p.*, phone.phone_number, phone.continuity_id,
               i.character_id, character.proxy_name AS character_name,
               character.avatar_url AS character_avatar_url
        FROM InstallationPhoneConversationParticipantsV2 p
        LEFT JOIN InstallationPhonesV2 phone ON phone.id = p.phone_id
        LEFT JOIN CharacterGuildInstallationsV2 i ON i.id = phone.installation_id
        LEFT JOIN CharactersV2 character ON character.id = i.character_id
        WHERE p.conversation_id = ? AND p.has_left = 0
        ORDER BY p.is_admin DESC, p.joined_at
    `).all(conversationId);
}

function getConversations(phoneId) {
    return db.prepare(`
        SELECT c.* FROM InstallationPhoneConversationsV2 c
        JOIN InstallationPhoneConversationParticipantsV2 p ON p.conversation_id = c.id
        WHERE p.phone_id = ? AND p.has_left = 0 ORDER BY c.updated_at DESC
    `).all(phoneId);
}

function getPrivateConversation(phoneAId, phoneBId) {
    return db.prepare(`SELECT * FROM InstallationPhoneConversationsV2
        WHERE conversation_type = 'private' AND phone_a_id = ? AND phone_b_id = ?`).get(phoneAId, phoneBId);
}

function insertPrivateConversation(data) {
    return db.prepare(`INSERT INTO InstallationPhoneConversationsV2 (
        guild_id, context_id, conversation_type, owner_phone_id, phone_a_id, phone_b_id, created_at, updated_at
    ) VALUES (?, ?, 'private', ?, ?, ?, ?, ?)`).run(
        String(data.guildId), data.contextId, data.ownerPhoneId, data.phoneAId,
        data.phoneBId, data.createdAt, data.createdAt
    ).lastInsertRowid;
}

function insertGroupConversation(data) {
    return db.prepare(`INSERT INTO InstallationPhoneConversationsV2 (
        guild_id, context_id, conversation_type, name, owner_phone_id, created_at, updated_at
    ) VALUES (?, ?, 'group', ?, ?, ?, ?)`).run(
        String(data.guildId), data.contextId, data.name || null,
        data.ownerPhoneId, data.createdAt, data.createdAt
    ).lastInsertRowid;
}

function insertParticipant(conversationId, phoneId, isAdmin, joinedAt) {
    return db.prepare(`INSERT INTO InstallationPhoneConversationParticipantsV2 (
        conversation_id, phone_id, participant_type, is_admin, joined_at
    ) VALUES (?, ?, 'greycore', ?, ?)`).run(conversationId, phoneId, isAdmin ? 1 : 0, joinedAt).lastInsertRowid;
}

function insertExternalParticipant(conversationId, participant, joinedAt) {
    return db.prepare(`INSERT INTO InstallationPhoneConversationParticipantsV2 (
        conversation_id,external_name,external_phone,participant_type,is_admin,joined_at
    ) VALUES (?,?,?,?,?,?)`).run(conversationId, participant.externalName || participant.name || null,
        participant.externalPhone || participant.phoneNumber || null,
        participant.participantType || "external", participant.isAdmin ? 1 : 0, joinedAt).lastInsertRowid;
}

function insertMessage(data) {
    return db.prepare(`INSERT INTO InstallationPhoneMessagesV2 (
        conversation_id, sender_phone_id, content, subject, message_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`).run(data.conversationId, data.senderPhoneId,
        data.content, data.subject || null, data.messageType || "text", data.createdAt).lastInsertRowid;
}

function getMessages(conversationId) {
    return db.prepare(`SELECT * FROM InstallationPhoneMessagesV2
        WHERE conversation_id = ? ORDER BY created_at, id`).all(conversationId);
}

function getMessage(id) {
    return db.prepare("SELECT * FROM InstallationPhoneMessagesV2 WHERE id = ?").get(id);
}

function deleteMessage(id) {
    return db.prepare("DELETE FROM InstallationPhoneMessagesV2 WHERE id = ?").run(id).changes;
}

function updateMessagePublication(id, data) {
    db.prepare(`UPDATE InstallationPhoneMessagesV2 SET public_guild_id = ?, public_channel_id = ?,
        webhook_message_id = ?, media_url = COALESCE(?, media_url) WHERE id = ?`).run(
        data.publicGuildId || null, data.publicChannelId || null,
        data.webhookMessageId || null, data.mediaUrl || null, id
    );
    return getMessage(id);
}

function touchConversation(id, updatedAt) {
    db.prepare("UPDATE InstallationPhoneConversationsV2 SET updated_at = ? WHERE id = ?")
        .run(updatedAt, id);
}

function getCall(id) {
    return db.prepare("SELECT * FROM InstallationPhoneCallsV2 WHERE id = ?").get(id);
}

function getActiveCall(phoneId) {
    return db.prepare(`SELECT * FROM InstallationPhoneCallsV2
        WHERE (caller_phone_id = ? OR receiver_phone_id = ?)
          AND status IN ('ringing','accepted') ORDER BY created_at DESC, id DESC LIMIT 1`).get(phoneId, phoneId);
}

function insertCall(data) {
    return db.prepare(`INSERT INTO InstallationPhoneCallsV2 (
        guild_id, context_id, caller_phone_id, receiver_phone_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ringing', ?, ?)`).run(String(data.guildId), data.contextId,
        data.callerPhoneId, data.receiverPhoneId, data.createdAt, data.createdAt).lastInsertRowid;
}

function transitionCall(id, expectedStatus, nextStatus, at) {
    const timestamp = nextStatus === "accepted" ? "answered_at" : "ended_at";
    return db.prepare(`UPDATE InstallationPhoneCallsV2 SET status = ?, ${timestamp} = ?, updated_at = ?
        WHERE id = ? AND status = ?`).run(nextStatus, at, at, id, expectedStatus).changes;
}

function expireStaleRingingCalls(limitDate, endedAt) {
    return db.prepare(`UPDATE InstallationPhoneCallsV2 SET status = 'missed', ended_at = ?, updated_at = ?
        WHERE status = 'ringing' AND created_at <= ?`).run(endedAt, endedAt, limitDate).changes;
}

function reconcileInterruptedCalls(startupCutoff, recoveryAt) {
    return db.transaction(() => ({
        ringing: db.prepare(`UPDATE InstallationPhoneCallsV2 SET status='missed', ended_at=?, updated_at=?
            WHERE status='ringing' AND created_at < ?`).run(recoveryAt, recoveryAt, startupCutoff).changes,
        accepted: db.prepare(`UPDATE InstallationPhoneCallsV2 SET status='ended', ended_at=?, updated_at=?
            WHERE status='accepted' AND created_at < ?`).run(recoveryAt, recoveryAt, startupCutoff).changes
    }))();
}

function getCallHistory(phoneId) {
    return db.prepare(`SELECT * FROM InstallationPhoneCallsV2
        WHERE caller_phone_id = ? OR receiver_phone_id = ? ORDER BY created_at DESC`).all(phoneId, phoneId);
}

function insertCallMessage(callId, speakerPhoneId, content, createdAt) {
    return db.prepare(`INSERT INTO InstallationPhoneCallMessagesV2
        (call_id,speaker_phone_id,content,created_at) VALUES (?,?,?,?)`)
        .run(callId, speakerPhoneId, content, createdAt).lastInsertRowid;
}

function getCallMessage(id) {
    return db.prepare("SELECT * FROM InstallationPhoneCallMessagesV2 WHERE id=?").get(id);
}

function getCallMessages(callId) {
    return db.prepare(`SELECT m.*, character.proxy_name AS speaker_name, character.avatar_url AS speaker_avatar
        FROM InstallationPhoneCallMessagesV2 m
        JOIN InstallationPhonesV2 phone ON phone.id=m.speaker_phone_id
        JOIN CharacterGuildInstallationsV2 i ON i.id=phone.installation_id
        JOIN CharactersV2 character ON character.id=i.character_id
        WHERE m.call_id=? ORDER BY m.created_at,m.id`).all(callId);
}

module.exports = {
    getContext, getContact, getContacts, getContactByLinkedPhone, getExternalContact,
    insertContact, deleteContact, updateContact, registerContactInteraction,
    getConversation, getConversationParticipant, getConversationParticipants, getConversations, getPrivateConversation,
    insertPrivateConversation, insertGroupConversation, insertParticipant, insertExternalParticipant,
    insertMessage, getMessages, getMessage,
    deleteMessage, updateMessagePublication, touchConversation,
    getCall, getActiveCall, insertCall, transitionCall, expireStaleRingingCalls,
    reconcileInterruptedCalls, getCallHistory, insertCallMessage, getCallMessage, getCallMessages,
    runInTransaction: operation => db.transaction(operation)()
};
