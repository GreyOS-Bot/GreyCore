const db =
    require(
        "../../database/database"
    );

class PhoneMessageRepository {

    getById(
        messageId
    ) {
        return db.prepare(`
            SELECT *
            FROM PhoneMessagesV2
            WHERE id = ?
        `).get(
            messageId
        );
    }

    create(
        data
    ) {
        const result =
            db.prepare(`
                INSERT INTO PhoneMessagesV2 (
                    conversation_id,
                    sender_phone_id,
                    content,
                    message_type,
                    media_url,
                    media_content_type,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.conversationId,
                data.senderPhoneId,
                data.content,
                data.messageType,
                data.mediaUrl || null,
                data.mediaContentType || null,
                data.createdAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    getForConversation(
        conversationId,
        limit
    ) {
        return db.prepare(`
            SELECT
                message.*,

                senderPhone.phone_number
                    AS sender_phone_number,

                senderPhone.continuity_id
                    AS sender_continuity_id,

                senderCharacter.proxy_name
                    AS sender_character_name,

                senderCharacter.avatar_url
                    AS sender_character_avatar_url

            FROM PhoneMessagesV2 message

            JOIN ContinuityPhonesV2 senderPhone
                ON senderPhone.id =
                    message.sender_phone_id

            JOIN CharacterContinuitiesV2 senderContinuity
                ON senderContinuity.id =
                    senderPhone.continuity_id

            JOIN CharactersV2 senderCharacter
                ON senderCharacter.id =
                    senderContinuity.character_id

            WHERE message.conversation_id = ?

            ORDER BY
                message.created_at DESC,
                message.id DESC

            LIMIT ?
        `).all(
            conversationId,
            limit
        );
    }

    insert(
        data
    ) {
        const result =
            db.prepare(`
                INSERT INTO PhoneMessagesV2 (
                    conversation_id,
                    sender_phone_id,
                    content,
                    message_type,
                    media_url,
                    media_content_type,
                    public_guild_id,
                    public_channel_id,
                    webhook_message_id,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.conversationId,
                data.senderPhoneId,
                data.content,
                data.messageType || "text",
                data.mediaUrl || null,
                data.mediaContentType || null,
                data.publicGuildId
                || null,
                data.publicChannelId
                || null,
                data.webhookMessageId
                || null,
                data.createdAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    updatePublication(
        messageId,
        data
    ) {
        db.prepare(`
            UPDATE PhoneMessagesV2
            SET
                public_guild_id = ?,
                public_channel_id = ?,
                webhook_message_id = ?,
                media_url = COALESCE(?, media_url)
            WHERE id = ?
        `).run(
            data.publicGuildId
            ?? null,
            data.publicChannelId
            ?? null,
            data.webhookMessageId
            ?? null,
            data.mediaUrl
            ?? null,
            messageId
        );

        return this.getById(
            messageId
        );
    }

    delete(
        messageId
    ) {
        return db.prepare(`
            DELETE FROM PhoneMessagesV2
            WHERE id = ?
        `).run(
            messageId
        );
    }

}

module.exports =
    new PhoneMessageRepository();
