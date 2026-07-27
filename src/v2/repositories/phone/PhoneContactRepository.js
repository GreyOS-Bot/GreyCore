// Accès aux données des contacts.
const db =
    require(
        "../../../database/database"
    );

function getById(
    contactId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneContactsV2
        WHERE id = ?
    `).get(contactId);
}

function getForPhone(
    phoneId
) {
    return db.prepare(`
        SELECT
            contact.*,
            linkedPhone.continuity_id
                AS linked_continuity_id,
            linkedCharacter.id
                AS linked_character_id,
            linkedCharacter.proxy_name
                AS linked_character_name,
            linkedCharacter.avatar_url
                AS linked_character_avatar_url

        FROM PhoneContactsV2 contact

        LEFT JOIN ContinuityPhonesV2 linkedPhone
            ON linkedPhone.id =
                contact.linked_phone_id

        LEFT JOIN CharacterContinuitiesV2
            AS linkedContinuity
            ON linkedContinuity.id =
                linkedPhone.continuity_id

        LEFT JOIN CharactersV2 linkedCharacter
            ON linkedCharacter.id =
                linkedContinuity.character_id

        WHERE contact.phone_id = ?

        ORDER BY
            contact.favorite DESC,
            contact.pinned DESC,
            contact.last_interaction_at DESC,
            contact.display_name
                COLLATE NOCASE ASC
    `).all(phoneId);
}

function getFavoriteForPhone(
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneContactsV2

        WHERE phone_id = ?
        AND favorite = 1

        ORDER BY
            pinned DESC,
            last_interaction_at DESC,
            display_name
                COLLATE NOCASE ASC
    `).all(phoneId);
}

function getBlockedForPhone(
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneContactsV2

        WHERE phone_id = ?
        AND blocked = 1

        ORDER BY
            display_name
                COLLATE NOCASE ASC
    `).all(phoneId);
}

function getByLinkedPhone(
    ownerPhoneId,
    linkedPhoneId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneContactsV2

        WHERE phone_id = ?
        AND linked_phone_id = ?
    `).get(
        ownerPhoneId,
        linkedPhoneId
    );
}

function getExternal(
    ownerPhoneId,
    displayName,
    phoneNumber = null
) {
    return db.prepare(`
        SELECT *
        FROM PhoneContactsV2

        WHERE phone_id = ?
        AND linked_phone_id IS NULL
        AND LOWER(
            display_name
        ) = LOWER(?)
        AND COALESCE(
            phone_number,
            ''
        ) = COALESCE(
            ?,
            ''
        )
    `).get(
        ownerPhoneId,
        displayName,
        phoneNumber
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

function getPhoneDetails(
    phoneId
) {
    return db.prepare(`
        SELECT
            phone.*,
            continuity.character_id,
            character.proxy_name
                AS character_name,
            character.avatar_url
                AS character_avatar_url

        FROM ContinuityPhonesV2 phone

        JOIN CharacterContinuitiesV2 continuity
            ON continuity.id =
                phone.continuity_id

        JOIN CharactersV2 character
            ON character.id =
                continuity.character_id

        WHERE phone.id = ?
    `).get(phoneId);
}

function updateGreycoreContact({
    contactId,
    displayName,
    phoneNumber,
    updatedAt
}) {
    db.prepare(`
        UPDATE PhoneContactsV2
        SET
            display_name = ?,
            phone_number = ?,
            contact_type = 'greycore',
            updated_at = ?
        WHERE id = ?
    `).run(
        displayName,
        phoneNumber,
        updatedAt,
        contactId
    );
}

function insertGreycoreContact({
    ownerPhoneId,
    linkedPhoneId,
    displayName,
    phoneNumber,
    favorite,
    pinned,
    blocked,
    createdAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneContactsV2 (
                phone_id,
                linked_phone_id,
                contact_type,
                display_name,
                phone_number,
                favorite,
                pinned,
                blocked,
                interaction_count,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                'greycore',
                ?,
                ?,
                ?,
                ?,
                ?,
                0,
                ?,
                ?
            )
        `).run(
            ownerPhoneId,
            linkedPhoneId,
            displayName,
            phoneNumber,
            favorite,
            pinned,
            blocked,
            createdAt,
            createdAt
        );

    return result.lastInsertRowid;
}

function updateExternalContact({
    contactId,
    contactType,
    favorite,
    pinned,
    blocked,
    notes,
    updatedAt
}) {
    db.prepare(`
        UPDATE PhoneContactsV2
        SET
            contact_type = ?,
            favorite = ?,
            pinned = ?,
            blocked = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        contactType,
        favorite,
        pinned,
        blocked,
        notes,
        updatedAt,
        contactId
    );
}

function insertExternalContact({
    ownerPhoneId,
    contactType,
    displayName,
    phoneNumber,
    favorite,
    pinned,
    blocked,
    notes,
    createdAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneContactsV2 (
                phone_id,
                linked_phone_id,
                contact_type,
                display_name,
                phone_number,
                favorite,
                pinned,
                blocked,
                interaction_count,
                last_interaction_at,
                notes,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                NULL,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                0,
                NULL,
                ?,
                ?,
                ?
            )
        `).run(
            ownerPhoneId,
            contactType,
            displayName,
            phoneNumber,
            favorite,
            pinned,
            blocked,
            notes,
            createdAt,
            createdAt
        );

    return result.lastInsertRowid;
}

function updateContact({
    contactId,
    displayName,
    phoneNumber,
    favorite,
    pinned,
    blocked,
    notes,
    updatedAt
}) {
    db.prepare(`
        UPDATE PhoneContactsV2
        SET
            display_name = ?,
            phone_number = ?,
            favorite = ?,
            pinned = ?,
            blocked = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        displayName,
        phoneNumber,
        favorite,
        pinned,
        blocked,
        notes,
        updatedAt,
        contactId
    );
}

function registerInteraction(
    contactId,
    occurredAt
) {
    db.prepare(`
        UPDATE PhoneContactsV2
        SET
            interaction_count =
                interaction_count + 1,
            last_interaction_at = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        occurredAt,
        occurredAt,
        contactId
    );
}

function search(
    ownerPhoneId,
    normalizedQuery,
    limit
) {
    const searchValue =
        `%${normalizedQuery}%`;

    return db.prepare(`
        SELECT
            contact.*,
            CASE
                WHEN LOWER(
                    contact.display_name
                ) = LOWER(?)
                THEN 100

                WHEN LOWER(
                    contact.display_name
                ) LIKE LOWER(?)
                THEN 80

                WHEN LOWER(
                    contact.display_name
                ) LIKE LOWER(?)
                THEN 60

                WHEN contact.phone_number
                    LIKE ?
                THEN 40

                ELSE 0
            END
            + CASE
                WHEN contact.favorite = 1
                THEN 30
                ELSE 0
            END
            + CASE
                WHEN contact.pinned = 1
                THEN 20
                ELSE 0
            END
            + MIN(
                contact.interaction_count,
                20
            )
            AS relevance_score

        FROM PhoneContactsV2 contact

        WHERE contact.phone_id = ?
        AND (
            LOWER(
                contact.display_name
            ) LIKE LOWER(?)
            OR contact.phone_number LIKE ?
        )
        AND contact.blocked = 0

        ORDER BY
            relevance_score DESC,
            contact.last_interaction_at DESC,
            contact.display_name
                COLLATE NOCASE ASC

        LIMIT ?
    `).all(
        normalizedQuery,
        `${normalizedQuery}%`,
        searchValue,
        searchValue,
        ownerPhoneId,
        searchValue,
        searchValue,
        limit
    );
}

function deleteById(
    contactId
) {
    db.prepare(`
        DELETE FROM PhoneContactsV2
        WHERE id = ?
    `).run(contactId);
}

module.exports = {
    runInTransaction:
        operation =>
            db.transaction(
                operation
            )(),
    getById,
    getForPhone,
    getFavoriteForPhone,
    getBlockedForPhone,
    getByLinkedPhone,
    getExternal,
    getPhoneById,
    getPhoneDetails,
    updateGreycoreContact,
    insertGreycoreContact,
    updateExternalContact,
    insertExternalContact,
    updateContact,
    registerInteraction,
    search,
    deleteById
};
