const db = require("../database/database");

class RelationshipTypeManager {
    createType(data) {
        const now = new Date().toISOString();

        const existing = db.prepare(`
            SELECT id
            FROM RelationshipTypes
            WHERE guild_id = ?
            AND LOWER(key) = LOWER(?)
        `).get(
            data.guildId,
            data.key.trim()
        );

        if (existing) {
            throw new Error(
                "Un type de relation avec cette clé existe déjà sur ce serveur."
            );
        }

        const result = db.prepare(`
            INSERT INTO RelationshipTypes (
                guild_id,
                key,
                label_a_to_b,
                label_b_to_a,
                is_symmetric,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            data.guildId,
            data.key.trim().toLowerCase(),
            data.labelAToB.trim(),
            data.labelBToA.trim(),
            data.isSymmetric ? 1 : 0,
            now
        );

        return this.getTypeById(result.lastInsertRowid);
    }

    getTypeById(id) {
        return db.prepare(`
            SELECT *
            FROM RelationshipTypes
            WHERE id = ?
        `).get(id);
    }

    getTypesByGuild(guildId) {
        return db.prepare(`
            SELECT *
            FROM RelationshipTypes
            WHERE guild_id = ?
            ORDER BY label_a_to_b ASC
        `).all(guildId);
    }

    searchRelationshipTypes(guildId, query, limit = 25) {
        const boundedLimit = Math.min(
            Math.max(Number.parseInt(limit, 10) || 0, 0),
            25
        );

        if (boundedLimit === 0) {
            return [];
        }

        const focusedValue = String(query || "").toLowerCase();
        const results = [];
        const pageSize = 100;
        let offset = 0;

        const selectPage = db.prepare(`
            SELECT *
            FROM RelationshipTypes
            WHERE guild_id = ?
            ORDER BY label_a_to_b ASC
            LIMIT ? OFFSET ?
        `);

        while (results.length < boundedLimit) {
            const rows = selectPage.all(
                guildId,
                pageSize,
                offset
            );

            for (const row of rows) {
                if (
                    row.label_a_to_b.toLowerCase().includes(focusedValue)
                    || row.label_b_to_a.toLowerCase().includes(focusedValue)
                    || row.key.toLowerCase().includes(focusedValue)
                ) {
                    results.push(row);

                    if (results.length === boundedLimit) {
                        break;
                    }
                }
            }

            if (rows.length < pageSize) {
                break;
            }

            offset += pageSize;
        }

        return results;
    }
}

module.exports = new RelationshipTypeManager();
