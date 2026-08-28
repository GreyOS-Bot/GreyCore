function database() {
    return require("../../database/database");
}

class DiscordReferenceHealthRepository {
    recordFailure(data) {
        database().prepare(`
            INSERT INTO DiscordReferenceHealth (
                domain, owner_key, resource_kind, discord_id, guild_id,
                status, discord_code, first_failed_at, last_checked_at,
                last_failed_at, failure_count, next_check_at, resolved_at,
                diagnostic
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, ?)
            ON CONFLICT (
                domain, owner_key, resource_kind, discord_id
            ) DO UPDATE SET
                guild_id = excluded.guild_id,
                status = excluded.status,
                discord_code = excluded.discord_code,
                first_failed_at = CASE
                    WHEN DiscordReferenceHealth.status = 'resolved'
                        THEN excluded.first_failed_at
                    ELSE DiscordReferenceHealth.first_failed_at
                END,
                last_checked_at = excluded.last_checked_at,
                last_failed_at = excluded.last_failed_at,
                failure_count = CASE
                    WHEN DiscordReferenceHealth.status = 'resolved'
                        THEN 1
                    ELSE DiscordReferenceHealth.failure_count + 1
                END,
                next_check_at = excluded.next_check_at,
                resolved_at = NULL,
                diagnostic = excluded.diagnostic
        `).run(
            data.domain,
            data.ownerKey,
            data.resourceKind,
            data.discordId,
            data.guildId,
            data.status,
            data.discordCode,
            data.checkedAt,
            data.checkedAt,
            data.checkedAt,
            data.nextCheckAt,
            data.diagnostic
        );

        return this.get(data);
    }

    get(data) {
        return database().prepare(`
            SELECT *
            FROM DiscordReferenceHealth
            WHERE domain = ?
            AND owner_key = ?
            AND resource_kind = ?
            AND discord_id = ?
        `).get(
            data.domain,
            data.ownerKey,
            data.resourceKind,
            data.discordId
        ) || null;
    }

    markResolved(data) {
        database().prepare(`
            INSERT INTO DiscordReferenceHealth (
                domain, owner_key, resource_kind, discord_id, guild_id,
                status, last_checked_at, failure_count, next_check_at,
                resolved_at
            ) VALUES (?, ?, ?, ?, ?, 'resolved', ?, 0, NULL, ?)
            ON CONFLICT (
                domain, owner_key, resource_kind, discord_id
            ) DO UPDATE SET
                guild_id = excluded.guild_id,
                status = 'resolved',
                discord_code = NULL,
                last_checked_at = excluded.last_checked_at,
                next_check_at = NULL,
                resolved_at = excluded.resolved_at,
                diagnostic = NULL
        `).run(
            data.domain,
            data.ownerKey,
            data.resourceKind,
            data.discordId,
            data.guildId,
            data.checkedAt,
            data.checkedAt
        );

        return this.get(data);
    }
}

module.exports = new DiscordReferenceHealthRepository();
