const db =
    require("../../database/database");

class AssetTypeRepository {

    getById(typeId) {
        return db.prepare(`
            SELECT *
            FROM AssetTypesV2
            WHERE id = ?
        `).get(typeId);
    }

    getForGuild(guildId, includeArchived = false) {
        return db.prepare(`
            SELECT *
            FROM AssetTypesV2
            WHERE guild_id = ?
            AND (
                ? = 1
                OR is_archived = 0
            )
            ORDER BY
                sort_order ASC,
                label COLLATE NOCASE ASC,
                id ASC
        `).all(
            guildId,
            includeArchived ? 1 : 0
        );
    }

    getByKey(guildId, typeKey) {
        return db.prepare(`
            SELECT *
            FROM AssetTypesV2
            WHERE guild_id = ?
            AND type_key = ?
        `).get(
            guildId,
            typeKey
        );
    }

    ensureDefaults(guildId, types, now) {
        const insert = db.prepare(`
            INSERT OR IGNORE INTO AssetTypesV2 (
                guild_id,
                type_key,
                label,
                emoji,
                is_system,
                sort_order,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        `);

        const ensure = db.transaction(() => {
            for (const type of types) {
                insert.run(
                    guildId,
                    type.key,
                    type.label,
                    type.emoji,
                    type.sortOrder,
                    now,
                    now
                );
            }
        });

        ensure();

        return this.getForGuild(guildId);
    }

    create(data) {
        const result = db.prepare(`
            INSERT INTO AssetTypesV2 (
                guild_id,
                type_key,
                label,
                emoji,
                is_system,
                sort_order,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, 0, ?, ?, ?)
        `).run(
            data.guildId,
            data.typeKey,
            data.label,
            data.emoji,
            data.sortOrder,
            data.createdAt,
            data.updatedAt
        );

        return this.getById(
            result.lastInsertRowid
        );
    }
}

module.exports =
    new AssetTypeRepository();
