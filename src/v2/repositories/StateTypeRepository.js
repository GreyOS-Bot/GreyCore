const db =
    require(
        "../../database/database"
    );

class StateTypeRepository {

    getById(
        stateTypeId
    ) {
        return db.prepare(`
            SELECT *
            FROM StateTypes
            WHERE id = ?
        `).get(
            stateTypeId
        );
    }

    getByName(
        guildId,
        name
    ) {
        return db.prepare(`
            SELECT *
            FROM StateTypes
            WHERE guild_id = ?
            AND LOWER(name) = LOWER(?)
        `).get(
            guildId,
            name
        );
    }

    getByGuild(
        guildId
    ) {
        return db.prepare(`
            SELECT *
            FROM StateTypes
            WHERE guild_id = ?
            ORDER BY
                name COLLATE NOCASE ASC,
                id ASC
        `).all(
            guildId
        );
    }

    create({
        guildId,
        name,
        emoji,
        color,
        createdBy,
        createdAt
    }) {
        const result =
            db.prepare(`
                INSERT INTO StateTypes (
                    guild_id,
                    name,
                    emoji,
                    color,
                    created_by,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                guildId,
                name,
                emoji,
                color,
                createdBy,
                createdAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    insertDefaults(
        guildId,
        stateTypes,
        createdBy,
        createdAt
    ) {
        const insert =
            db.prepare(`
                INSERT OR IGNORE INTO StateTypes (
                    guild_id,
                    name,
                    emoji,
                    color,
                    created_by,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `);

        const insertAll =
            db.transaction(
                () => {
                    for (
                        const stateType
                        of stateTypes
                    ) {
                        insert.run(
                            guildId,
                            stateType.name,
                            stateType.emoji,
                            stateType.color,
                            createdBy,
                            createdAt
                        );
                    }
                }
            );

        insertAll();

        return this.getByGuild(
            guildId
        );
    }

    countUsages(
        guildId,
        stateTypeId
    ) {
        const legacy =
            db.prepare(`
                SELECT COUNT(*) AS total
                FROM CharacterStates
                WHERE guild_id = ?
                AND state_type_id = ?
            `).get(
                guildId,
                stateTypeId
            )?.total
            || 0;

        const continuities =
            db.prepare(`
                SELECT COUNT(*) AS total
                FROM ContinuityStatesV2
                WHERE state_type_id = ?
            `).get(
                stateTypeId
            )?.total
            || 0;

        return (
            legacy
            + continuities
        );
    }

    delete(
        guildId,
        stateTypeId
    ) {
        return db.prepare(`
            DELETE FROM StateTypes
            WHERE id = ?
            AND guild_id = ?
        `).run(
            stateTypeId,
            guildId
        );
    }

}

module.exports =
    new StateTypeRepository();
