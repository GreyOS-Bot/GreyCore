// Accès aux données des appels.
const db =
    require(
        "../../../database/database"
    );

function getById(
    callId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneCallsV2
        WHERE id = ?
    `).get(callId);
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

function getActiveForPhone(
    phoneId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneCallsV2

        WHERE (
            caller_phone_id = ?
            OR receiver_phone_id = ?
        )
        AND status IN (
            'ringing',
            'accepted'
        )

        ORDER BY
            created_at DESC,
            id DESC

        LIMIT 1
    `).get(
        phoneId,
        phoneId
    );
}

function getHistoryForPhone(
    phoneId,
    limit
) {
    return db.prepare(`
        SELECT
            call.*,

            CASE
                WHEN call.caller_phone_id = ?
                THEN receiverPhone.id
                ELSE callerPhone.id
            END
                AS other_phone_id,

            CASE
                WHEN call.caller_phone_id = ?
                THEN receiverCharacter.id
                ELSE callerCharacter.id
            END
                AS other_character_id,

            CASE
                WHEN call.caller_phone_id = ?
                THEN receiverCharacter.proxy_name
                ELSE callerCharacter.proxy_name
            END
                AS other_character_name,

            CASE
                WHEN call.caller_phone_id = ?
                THEN receiverCharacter.avatar_url
                ELSE callerCharacter.avatar_url
            END
                AS other_character_avatar

        FROM PhoneCallsV2 call

        JOIN ContinuityPhonesV2 callerPhone
            ON callerPhone.id =
                call.caller_phone_id

        JOIN ContinuityPhonesV2 receiverPhone
            ON receiverPhone.id =
                call.receiver_phone_id

        JOIN CharacterContinuitiesV2 callerContinuity
            ON callerContinuity.id =
                callerPhone.continuity_id

        JOIN CharacterContinuitiesV2 receiverContinuity
            ON receiverContinuity.id =
                receiverPhone.continuity_id

        JOIN CharactersV2 callerCharacter
            ON callerCharacter.id =
                callerContinuity.character_id

        JOIN CharactersV2 receiverCharacter
            ON receiverCharacter.id =
                receiverContinuity.character_id

        WHERE
            call.caller_phone_id = ?
            OR call.receiver_phone_id = ?

        ORDER BY
            call.created_at DESC

        LIMIT ?
    `).all(
        phoneId,
        phoneId,
        phoneId,
        phoneId,
        phoneId,
        phoneId,
        limit
    );
}

function insertCall({
    callerPhoneId,
    receiverPhoneId,
    createdAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneCallsV2 (
                caller_phone_id,
                receiver_phone_id,
                status,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                'ringing',
                ?,
                ?
            )
        `).run(
            callerPhoneId,
            receiverPhoneId,
            createdAt,
            createdAt
        );

    return result.lastInsertRowid;
}

function transitionCall({
    callId,
    expectedStatus,
    nextStatus,
    occurredAt,
    timestampField,
    updateTimestamp = false
}) {
    if (
        timestampField ===
        "answered_at"
    ) {
        return db.prepare(`
            UPDATE PhoneCallsV2
            SET
                status = ?,
                answered_at = ?,
                updated_at = ?
            WHERE id = ?
            AND status = ?
        `).run(
            nextStatus,
            occurredAt,
            occurredAt,
            callId,
            expectedStatus
        ).changes;
    }

    return db.prepare(`
        UPDATE PhoneCallsV2
        SET
            status = ?,
            ended_at = ?,
            updated_at = ?
        WHERE id = ?
        AND status = ?
    `).run(
        nextStatus,
        occurredAt,
        occurredAt,
        callId,
        expectedStatus
    ).changes;
}

function expireStaleRingingCalls({
    endedAt,
    limitDate
}) {
    return db.prepare(`
        UPDATE PhoneCallsV2
        SET
            status = 'missed',
            ended_at = ?,
            updated_at = ?
        WHERE status = 'ringing'
        AND created_at <= ?
    `).run(
        endedAt,
        endedAt,
        limitDate
    ).changes;
}

function reconcileInterruptedCalls({
    startupCutoff,
    recoveryAt
}) {
    return db.transaction(
        () => {
            const ringing =
                db.prepare(`
                    UPDATE PhoneCallsV2
                    SET
                        status = 'missed',
                        ended_at = ?,
                        updated_at = ?
                    WHERE status = 'ringing'
                    AND created_at < ?
                `).run(
                    recoveryAt,
                    recoveryAt,
                    startupCutoff
                ).changes;

            const accepted =
                db.prepare(`
                    UPDATE PhoneCallsV2
                    SET
                        status = 'ended',
                        ended_at = ?,
                        updated_at = ?
                    WHERE status = 'accepted'
                    AND created_at < ?
                `).run(
                    recoveryAt,
                    recoveryAt,
                    startupCutoff
                ).changes;

            return {
                ringing,
                accepted
            };
        }
    )();
}

function insertMessage({
    callId,
    speakerPhoneId,
    content,
    createdAt
}) {
    const result =
        db.prepare(`
            INSERT INTO PhoneCallMessagesV2 (
                call_id,
                speaker_phone_id,
                content,
                created_at
            )
            VALUES (?, ?, ?, ?)
        `).run(
            callId,
            speakerPhoneId,
            content,
            createdAt
        );

    return result.lastInsertRowid;
}

function getMessageById(
    messageId
) {
    return db.prepare(`
        SELECT *
        FROM PhoneCallMessagesV2
        WHERE id = ?
    `).get(messageId);
}

function getMessages(
    callId
) {
    return db.prepare(`
        SELECT
            message.*,
            character.proxy_name
                AS speaker_name,
            character.avatar_url
                AS speaker_avatar

        FROM PhoneCallMessagesV2 message

        JOIN ContinuityPhonesV2 phone
            ON phone.id =
                message.speaker_phone_id

        JOIN CharacterContinuitiesV2 continuity
            ON continuity.id =
                phone.continuity_id

        JOIN CharactersV2 character
            ON character.id =
                continuity.character_id

        WHERE message.call_id = ?

        ORDER BY
            message.created_at ASC,
            message.id ASC
    `).all(callId);
}

module.exports = {
    getById,
    getPhoneById,
    getActiveForPhone,
    getHistoryForPhone,
    insertCall,
    transitionCall,
    expireStaleRingingCalls,
    reconcileInterruptedCalls,
    insertMessage,
    getMessageById,
    getMessages
};
