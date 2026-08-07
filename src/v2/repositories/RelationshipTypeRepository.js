const db =
    require(
        "../../database/database"
    );

class RelationshipTypeRepository {

    getByGuild(
        guildId
    ) {
        return db.prepare(`
            SELECT *
            FROM RelationshipTypes
            WHERE guild_id = ?
            ORDER BY
                label_a_to_b
                    COLLATE NOCASE ASC,
                id ASC
        `).all(
            guildId
        );
    }

    getById(
        guildId,
        relationshipTypeId
    ) {
        return db.prepare(`
            SELECT *
            FROM RelationshipTypes
            WHERE id = ?
            AND guild_id = ?
        `).get(
            relationshipTypeId,
            guildId
        );
    }

    getByKey(guildId, key) {
        return db.prepare(`
            SELECT * FROM RelationshipTypes
            WHERE guild_id = ? AND key = ?
        `).get(guildId, key);
    }

    create(data) {
        const result = db.prepare(`
            INSERT INTO RelationshipTypes (
                guild_id, key, label_a_to_b, label_b_to_a,
                is_symmetric, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            data.guildId, data.key, data.labelAToB, data.labelBToA,
            data.isSymmetric ? 1 : 0, data.createdAt
        );
        return this.getById(data.guildId, result.lastInsertRowid);
    }

}

module.exports =
    new RelationshipTypeRepository();
