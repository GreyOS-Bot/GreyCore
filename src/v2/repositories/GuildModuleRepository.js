const db =
    require(
        "../../database/database"
    );

class GuildModuleRepository {

    getAll(
        guildId
    ) {
        return db.prepare(`
            SELECT *
            FROM GuildModulesV2
            WHERE guild_id = ?
            ORDER BY module_key ASC
        `).all(
            guildId
        );
    }

    get(
        guildId,
        moduleKey
    ) {
        return db.prepare(`
            SELECT *
            FROM GuildModulesV2
            WHERE guild_id = ?
            AND module_key = ?
        `).get(
            guildId,
            moduleKey
        );
    }

    ensureDefaults(
        guildId,
        moduleKeys,
        updatedAt
    ) {
        const insert =
            db.prepare(`
                INSERT OR IGNORE INTO GuildModulesV2 (
                    guild_id,
                    module_key,
                    is_enabled,
                    updated_at
                )
                VALUES (?, ?, 1, ?)
            `);

        const ensure =
            db.transaction(
                () => {
                    for (
                        const moduleKey
                        of moduleKeys
                    ) {
                        insert.run(
                            guildId,
                            moduleKey,
                            updatedAt
                        );
                    }
                }
            );

        ensure();

        return this.getAll(
            guildId
        );
    }

    setEnabled(
        guildId,
        moduleKey,
        enabled,
        updatedAt
    ) {
        db.prepare(`
            INSERT INTO GuildModulesV2 (
                guild_id,
                module_key,
                is_enabled,
                updated_at
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(
                guild_id,
                module_key
            )
            DO UPDATE SET
                is_enabled =
                    excluded.is_enabled,
                updated_at =
                    excluded.updated_at
        `).run(
            guildId,
            moduleKey,
            enabled ? 1 : 0,
            updatedAt
        );

        return this.get(
            guildId,
            moduleKey
        );
    }

}

module.exports =
    new GuildModuleRepository();
