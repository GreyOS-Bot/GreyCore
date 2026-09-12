const db =
    require(
        "../../database/database"
    );

const SELECT_STATE = `
    SELECT
        continuityState.*,
        stateType.name,
        stateType.emoji,
        stateType.color
    FROM ContinuityStatesV2
        AS continuityState
    JOIN StateTypes
        AS stateType
        ON stateType.id =
            continuityState.state_type_id
`;

class StateRepository {

    assertLegacyWritable() {
        if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='InstallationStatesV2'").get()) {
            throw new Error("ContinuityStatesV2 est une archive legacy en lecture seule.");
        }
    }

    getActive(
        continuityId
    ) {
        return db.prepare(`
            ${SELECT_STATE}
            WHERE continuityState.continuity_id = ?
            AND continuityState.ended_at IS NULL
            ORDER BY
                continuityState.started_at DESC,
                continuityState.id DESC
        `).all(
            continuityId
        );
    }

    getHistory(
        continuityId
    ) {
        return db.prepare(`
            ${SELECT_STATE}
            WHERE continuityState.continuity_id = ?
            ORDER BY
                continuityState.started_at DESC,
                continuityState.id DESC
        `).all(
            continuityId
        );
    }

    getById(
        stateId
    ) {
        return db.prepare(`
            ${SELECT_STATE}
            WHERE continuityState.id = ?
        `).get(
            stateId
        );
    }

    findActive(
        continuityId,
        stateTypeId
    ) {
        return db.prepare(`
            SELECT id
            FROM ContinuityStatesV2
            WHERE continuity_id = ?
            AND state_type_id = ?
            AND ended_at IS NULL
        `).get(
            continuityId,
            stateTypeId
        );
    }

    getStateType(
        stateTypeId,
        guildId
    ) {
        return db.prepare(`
            SELECT id
            FROM StateTypes
            WHERE id = ?
            AND guild_id = ?
        `).get(
            stateTypeId,
            guildId
        );
    }

    insert(
        data
    ) {
        this.assertLegacyWritable();
        const result =
            db.prepare(`
                INSERT INTO ContinuityStatesV2 (
                    continuity_id,
                    state_type_id,
                    note,
                    started_at,
                    ended_at,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
            `).run(
                data.continuityId,
                data.stateTypeId,
                data.note,
                data.startedAt,
                data.createdBy,
                data.createdAt,
                data.updatedAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    end(
        stateId,
        endedAt
    ) {
        this.assertLegacyWritable();
        db.prepare(`
            UPDATE ContinuityStatesV2
            SET
                ended_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            endedAt,
            endedAt,
            stateId
        );

        return this.getById(
            stateId
        );
    }

    update(
        stateId,
        data
    ) {
        this.assertLegacyWritable();
        db.prepare(`
            UPDATE ContinuityStatesV2
            SET
                note = ?,
                started_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.note,
            data.startedAt,
            data.updatedAt,
            stateId
        );

        return this.getById(
            stateId
        );
    }

    delete(
        stateId
    ) {
        this.assertLegacyWritable();
        return db.prepare(`
            DELETE FROM ContinuityStatesV2
            WHERE id = ?
        `).run(
            stateId
        );
    }

}

module.exports =
    new StateRepository();
