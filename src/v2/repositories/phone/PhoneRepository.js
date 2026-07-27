// Accès aux données du cœur Téléphone.
const db =
    require(
        "../../../database/database"
    );

function getPhoneById(
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM ContinuityPhonesV2
        WHERE id = ?
    `).get(phoneId);
}

function getPhoneByContinuity(
    continuityId
) {
    return db.prepare(`
        SELECT *
        FROM ContinuityPhonesV2
        WHERE continuity_id = ?
    `).get(continuityId);
}

function getContinuityByPhone(
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM CharacterContinuitiesV2
        WHERE id = (
            SELECT continuity_id
            FROM ContinuityPhonesV2
            WHERE id = ?
        )
    `).get(phoneId);
}

function getPhoneByNumber(
    phoneNumber
) {
    return db.prepare(`
        SELECT *
        FROM ContinuityPhonesV2
        WHERE phone_number = ?
    `).get(phoneNumber);
}

function insertPhone({
    continuityId,
    phoneNumber,
    isActive,
    createdAt,
    updatedAt
}) {
    const result =
        db.prepare(`
            INSERT INTO ContinuityPhonesV2 (
                continuity_id,
                phone_number,
                is_active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            continuityId,
            phoneNumber,
            isActive,
            createdAt,
            updatedAt
        );

    return result.lastInsertRowid;
}

function setActive(
    phoneId,
    isActive,
    updatedAt
) {
    db.prepare(`
        UPDATE ContinuityPhonesV2
        SET
            is_active = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        isActive,
        updatedAt,
        phoneId
    );
}

function touchConversation(
    conversationId,
    updatedAt
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
    getPhoneById,
    getPhoneByContinuity,
    getContinuityByPhone,
    getPhoneByNumber,
    insertPhone,
    setActive,
    touchConversation
};
