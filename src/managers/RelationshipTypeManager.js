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
}

module.exports = new RelationshipTypeManager();