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

    countUsages(guildId, relationshipTypeId) {
        const queries = [
            "SELECT COUNT(*) AS total FROM CharacterRelationships WHERE guild_id = ? AND relationship_type_id = ?",
            "SELECT COUNT(*) AS total FROM PendingRelationships WHERE guild_id = ? AND relationship_type_id = ?",
            "SELECT COUNT(*) AS total FROM ContinuityRelationshipsV2 WHERE guild_id = ? AND relationship_type_id = ?",
            `SELECT COUNT(DISTINCT pending.id) AS total
             FROM PendingContinuityRelationshipsV2 AS pending
             JOIN CharacterGuildInstallationsV2 AS installation
               ON installation.continuity_id IN (pending.requester_continuity_id, pending.target_continuity_id)
             WHERE installation.guild_id = ? AND pending.relationship_type_id = ?`
        ];
        return queries.reduce(
            (total, sql) => total + Number(db.prepare(sql).get(guildId, relationshipTypeId)?.total || 0),
            0
        );
    }

    delete(guildId, relationshipTypeId) {
        return db.prepare(`
            DELETE FROM RelationshipTypes
            WHERE guild_id = ? AND id = ?
        `).run(guildId, relationshipTypeId);
    }

}

module.exports =
    new RelationshipTypeRepository();
