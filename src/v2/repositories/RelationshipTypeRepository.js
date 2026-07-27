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

}

module.exports =
    new RelationshipTypeRepository();
