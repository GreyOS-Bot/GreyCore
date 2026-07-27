const db =
    require(
        "../../database/database"
    );

class GuildSettingsRepository {

    get(
        guildId
    ) {
        return db.prepare(`
            SELECT *
            FROM GuildSettingsV2
            WHERE guild_id = ?
        `).get(
            guildId
        );
    }

    insert(
        guildId,
        createdAt
    ) {
        db.prepare(`
            INSERT INTO GuildSettingsV2 (
                guild_id,
                validation_channel_id,
                error_log_channel_id,
                created_at,
                updated_at
            )
            VALUES (?, NULL, NULL, ?, ?)
        `).run(
            guildId,
            createdAt,
            createdAt
        );

        return this.get(
            guildId
        );
    }

    setValidationChannel(
        guildId,
        channelId,
        updatedAt
    ) {
        db.prepare(`
            INSERT INTO GuildSettingsV2 (
                guild_id,
                validation_channel_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(guild_id)
            DO UPDATE SET
                validation_channel_id =
                    excluded.validation_channel_id,
                updated_at =
                    excluded.updated_at
        `).run(
            guildId,
            channelId,
            updatedAt,
            updatedAt
        );

        return this.get(
            guildId
        );
    }

    removeValidationChannel(
        guildId,
        updatedAt
    ) {
        db.prepare(`
            UPDATE GuildSettingsV2
            SET
                validation_channel_id = NULL,
                updated_at = ?
            WHERE guild_id = ?
        `).run(
            updatedAt,
            guildId
        );

        return this.get(
            guildId
        );
    }

    setErrorLogChannel(
        guildId,
        channelId,
        updatedAt
    ) {
        db.prepare(`
            INSERT INTO GuildSettingsV2 (
                guild_id,
                validation_channel_id,
                error_log_channel_id,
                created_at,
                updated_at
            )
            VALUES (?, NULL, ?, ?, ?)

            ON CONFLICT(guild_id)
            DO UPDATE SET
                error_log_channel_id =
                    excluded.error_log_channel_id,
                updated_at =
                    excluded.updated_at
        `).run(
            guildId,
            channelId,
            updatedAt,
            updatedAt
        );

        return this.get(
            guildId
        );
    }

    removeErrorLogChannel(
        guildId,
        updatedAt
    ) {
        this.insertIfMissing(
            guildId,
            updatedAt
        );

        db.prepare(`
            UPDATE GuildSettingsV2
            SET
                error_log_channel_id = NULL,
                updated_at = ?
            WHERE guild_id = ?
        `).run(
            updatedAt,
            guildId
        );

        return this.get(
            guildId
        );
    }

    insertIfMissing(
        guildId,
        timestamp
    ) {
        db.prepare(`
            INSERT INTO GuildSettingsV2 (
                guild_id,
                validation_channel_id,
                error_log_channel_id,
                created_at,
                updated_at
            )
            VALUES (?, NULL, NULL, ?, ?)
            ON CONFLICT(guild_id) DO NOTHING
        `).run(
            guildId,
            timestamp,
            timestamp
        );
    }

}

module.exports =
    new GuildSettingsRepository();
