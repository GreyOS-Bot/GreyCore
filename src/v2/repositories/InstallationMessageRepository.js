const db =
    require(
        "../../database/database"
    );

class InstallationMessageRepository {

    getByInstallationId(
        installationId
    ) {
        return db.prepare(`
            SELECT *
            FROM CharacterInstallationMessagesV2
            WHERE installation_id = ?
        `).get(
            installationId
        );
    }

    save(
        data
    ) {
        db.prepare(`
            INSERT INTO
            CharacterInstallationMessagesV2 (
                installation_id,
                guild_id,
                channel_id,
                message_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)

            ON CONFLICT(installation_id)
            DO UPDATE SET
                guild_id =
                    excluded.guild_id,
                channel_id =
                    excluded.channel_id,
                message_id =
                    excluded.message_id,
                updated_at =
                    excluded.updated_at
        `).run(
            data.installationId,
            data.guildId,
            data.channelId,
            data.messageId,
            data.createdAt,
            data.updatedAt
        );

        return this.getByInstallationId(
            data.installationId
        );
    }

    delete(
        installationId
    ) {
        return db.prepare(`
            DELETE FROM
            CharacterInstallationMessagesV2
            WHERE installation_id = ?
        `).run(
            installationId
        );
    }

}

module.exports =
    new InstallationMessageRepository();
