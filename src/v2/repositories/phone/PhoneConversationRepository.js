// Accès aux données des conversations.
const db =
    require(
        "../../../database/database"
    );

function getById(
    conversationId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneConversationsV2
        WHERE id = ?
    `).get(conversationId);
}

function getParticipantById(
    participantId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneConversationParticipantsV2
        WHERE id = ?
    `).get(participantId);
}

function getParticipants(
    conversationId
) {
    return db.prepare(`
        SELECT
            participant.*,
            phone.phone_number,
            continuity.id
                AS continuity_id,
            character.id
                AS character_id,
            character.proxy_name
                AS character_name,
            character.avatar_url
                AS character_avatar_url

        FROM PhoneConversationParticipantsV2
            AS participant

        LEFT JOIN ContinuityPhonesV2 phone
            ON phone.id =
                participant.phone_id

        LEFT JOIN CharacterContinuitiesV2
            AS continuity
            ON continuity.id =
                phone.continuity_id

        LEFT JOIN CharactersV2 character
            ON character.id =
                continuity.character_id

        WHERE participant.conversation_id = ?
        AND participant.has_left = 0

        ORDER BY
            participant.is_admin DESC,
            participant.joined_at ASC
    `).all(conversationId);
}

function getParticipant(
    conversationId,
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneConversationParticipantsV2

        WHERE conversation_id = ?
        AND phone_id = ?
        AND has_left = 0
    `).get(
        conversationId,
        phoneId
    );
}

function getPrivateBetweenPhones(
    phoneAId,
    phoneBId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneConversationsV2

        WHERE conversation_type = 'private'
        AND phone_a_id = ?
        AND phone_b_id = ?
    `).get(
        phoneAId,
        phoneBId
    );
}

function getPhoneById(
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM ContinuityPhonesV2
        WHERE id = ?
    `).get(phoneId);
}

function insertPrivate({
    ownerPhoneId,
    phoneAId,
    phoneBId,
    createdAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneConversationsV2 (
                conversation_type,
                owner_phone_id,
                phone_a_id,
                phone_b_id,
                created_at,
                updated_at
            )
            VALUES (
                'private',
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `).run(
            ownerPhoneId,
            phoneAId,
            phoneBId,
            createdAt,
            createdAt
        );

    return Number(
        result.lastInsertRowid
    );
}

function insertGroup({
    name,
    ownerPhoneId,
    createdAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneConversationsV2 (
                conversation_type,
                name,
                owner_phone_id,
                phone_a_id,
                phone_b_id,
                created_at,
                updated_at
            )
            VALUES (
                'group',
                ?,
                ?,
                NULL,
                NULL,
                ?,
                ?
            )
        `).run(
            name,
            ownerPhoneId,
            createdAt,
            createdAt
        );

    return Number(
        result.lastInsertRowid
    );
}

function findGreycoreParticipant(
    conversationId,
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneConversationParticipantsV2

        WHERE conversation_id = ?
        AND phone_id = ?
    `).get(
        conversationId,
        phoneId
    );
}

function restoreGreycoreParticipant({
    participantId,
    isAdmin,
    joinedAt
}) {
    db.prepare(`
        UPDATE PhoneConversationParticipantsV2

        SET
            has_left = 0,
            left_at = NULL,
            is_admin = ?,
            joined_at = ?

        WHERE id = ?
    `).run(
        isAdmin,
        joinedAt,
        participantId
    );
}

function insertGreycoreParticipant({
    conversationId,
    phoneId,
    isAdmin,
    joinedAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneConversationParticipantsV2 (
                conversation_id,
                phone_id,
                participant_type,
                is_admin,
                has_left,
                joined_at
            )
            VALUES (?, ?, 'greycore', ?, 0, ?)
        `).run(
            conversationId,
            phoneId,
            isAdmin,
            joinedAt
        );

    return result.lastInsertRowid;
}

function findExternalParticipant({
    conversationId,
    externalName,
    externalPhone
}) {
    return db.prepare(`
        SELECT *
        FROM PhoneConversationParticipantsV2

        WHERE conversation_id = ?
        AND phone_id IS NULL
        AND COALESCE(external_name, '') =
            COALESCE(?, '')
        AND COALESCE(external_phone, '') =
            COALESCE(?, '')
    `).get(
        conversationId,
        externalName,
        externalPhone
    );
}

function restoreExternalParticipant({
    participantId,
    participantType,
    joinedAt
}) {
    db.prepare(`
        UPDATE PhoneConversationParticipantsV2

        SET
            participant_type = ?,
            has_left = 0,
            left_at = NULL,
            joined_at = ?

        WHERE id = ?
    `).run(
        participantType,
        joinedAt,
        participantId
    );
}

function insertExternalParticipant({
    conversationId,
    externalName,
    externalPhone,
    participantType,
    isAdmin,
    joinedAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneConversationParticipantsV2 (
                conversation_id,
                phone_id,
                external_name,
                external_phone,
                participant_type,
                is_admin,
                has_left,
                joined_at
            )
            VALUES (
                ?,
                NULL,
                ?,
                ?,
                ?,
                ?,
                0,
                ?
            )
        `).run(
            conversationId,
            externalName,
            externalPhone,
            participantType,
            isAdmin,
            joinedAt
        );

    return result.lastInsertRowid;
}

function markParticipantLeft(
    participantId,
    leftAt
) {
    db.prepare(`
        UPDATE PhoneConversationParticipantsV2

        SET
            has_left = 1,
            left_at = ?

        WHERE id = ?
    `).run(
        leftAt,
        participantId
    );
}

function renameGroup(
    conversationId,
    name,
    updatedAt
) {
    db.prepare(`
        UPDATE PhoneConversationsV2

        SET
            name = ?,
            updated_at = ?

        WHERE id = ?
    `).run(
        name,
        updatedAt,
        conversationId
    );
}

function getForPhone(
    phoneId
) {
    return db.prepare(`
        SELECT
            conversation.*,
            settings.is_favorite,
            settings.is_pinned,
            settings.is_muted,
            settings.is_hidden,
            reads.unread_count,
            lastMessage.id
                AS last_message_id,
            lastMessage.content
                AS last_message_content,
            lastMessage.created_at
                AS last_message_created_at,
            lastMessage.sender_phone_id
                AS last_message_sender_phone_id

        FROM PhoneConversationsV2 conversation

        JOIN PhoneConversationParticipantsV2 participant
            ON participant.conversation_id =
                conversation.id

        LEFT JOIN PhoneConversationSettingsV2 settings
            ON settings.conversation_id =
                conversation.id
            AND settings.phone_id = ?

        LEFT JOIN PhoneConversationReadsV2 reads
            ON reads.conversation_id =
                conversation.id
            AND reads.phone_id = ?

        LEFT JOIN PhoneMessagesV2 lastMessage
            ON lastMessage.id = (
                SELECT message.id
                FROM PhoneMessagesV2 message
                WHERE message.conversation_id =
                    conversation.id
                ORDER BY
                    message.created_at DESC,
                    message.id DESC
                LIMIT 1
            )

        WHERE participant.phone_id = ?
        AND participant.has_left = 0
        AND COALESCE(
            settings.is_hidden,
            0
        ) = 0

        ORDER BY
            COALESCE(
                settings.is_pinned,
                0
            ) DESC,
            CASE
                WHEN COALESCE(
                    reads.unread_count,
                    0
                ) > 0
                THEN 1
                ELSE 0
            END DESC,
            COALESCE(
                lastMessage.created_at,
                conversation.updated_at
            ) DESC
    `).all(
        phoneId,
        phoneId,
        phoneId
    );
}

function touch(
    conversationId,
    updatedAt =
        new Date().toISOString()
) {
    db.prepare(`
        UPDATE PhoneConversationsV2
        SET updated_at = ?
        WHERE id = ?
    `).run(
        updatedAt,
        conversationId
    );
}

module.exports = {
    runInTransaction:
        operation =>
            db.transaction(
                operation
            )(),
    getById,
    getParticipantById,
    getParticipants,
    getParticipant,
    getPrivateBetweenPhones,
    getPhoneById,
    insertPrivate,
    insertGroup,
    findGreycoreParticipant,
    restoreGreycoreParticipant,
    insertGreycoreParticipant,
    findExternalParticipant,
    restoreExternalParticipant,
    insertExternalParticipant,
    markParticipantLeft,
    renameGroup,
    getForPhone,
    touch
};
