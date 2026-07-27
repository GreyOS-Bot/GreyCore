const db =
    require(
        "../../database/database"
    );

class OutfitRepository {

    getById(
        outfitId
    ) {
        return db.prepare(`
            SELECT *
            FROM ContinuityOutfitsV2
            WHERE id = ?
        `).get(
            outfitId
        );
    }

    getCurrent(
        continuityId
    ) {
        return db.prepare(`
            SELECT *
            FROM ContinuityOutfitsV2
            WHERE continuity_id = ?
            AND is_current = 1
            ORDER BY
                updated_at DESC,
                id DESC
            LIMIT 1
        `).get(
            continuityId
        );
    }

    getForContinuity(
        continuityId,
        limit
    ) {
        return db.prepare(`
            SELECT *
            FROM ContinuityOutfitsV2
            WHERE continuity_id = ?
            ORDER BY
                is_current DESC,
                updated_at DESC,
                id DESC
            LIMIT ?
        `).all(
            continuityId,
            limit
        );
    }

    getHistory(
        continuityId,
        limit
    ) {
        return db.prepare(`
            SELECT *
            FROM ContinuityOutfitsV2
            WHERE continuity_id = ?
            ORDER BY
                created_at DESC,
                id DESC
            LIMIT ?
        `).all(
            continuityId,
            limit
        );
    }

    getContinuityById(
        continuityId
    ) {
        return db.prepare(`
            SELECT id
            FROM CharacterContinuitiesV2
            WHERE id = ?
        `).get(
            continuityId
        );
    }

    createCurrent(
        data
    ) {
        const create =
            db.transaction(
                () => {
                    db.prepare(`
                        UPDATE ContinuityOutfitsV2
                        SET
                            is_current = 0,
                            updated_at = ?
                        WHERE continuity_id = ?
                        AND is_current = 1
                    `).run(
                        data.updatedAt,
                        data.continuityId
                    );

                    const result =
                        db.prepare(`
                            INSERT INTO ContinuityOutfitsV2 (
                                continuity_id,
                                image_url,
                                title,
                                description,
                                is_current,
                                created_at,
                                updated_at
                            )
                            VALUES (?, ?, ?, ?, 1, ?, ?)
                        `).run(
                            data.continuityId,
                            data.imageUrl,
                            data.title,
                            data.description,
                            data.createdAt,
                            data.updatedAt
                        );

                    return result
                        .lastInsertRowid;
                }
            );

        return this.getById(
            create()
        );
    }

    updateDetails(
        outfitId,
        data
    ) {
        db.prepare(`
            UPDATE ContinuityOutfitsV2
            SET
                title = ?,
                description = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.title,
            data.description,
            data.updatedAt,
            outfitId
        );

        return this.getById(
            outfitId
        );
    }

    setCurrent(
        outfit,
        updatedAt
    ) {
        const select =
            db.transaction(
                () => {
                    db.prepare(`
                        UPDATE ContinuityOutfitsV2
                        SET
                            is_current = 0,
                            updated_at = ?
                        WHERE continuity_id = ?
                    `).run(
                        updatedAt,
                        outfit
                            .continuity_id
                    );

                    db.prepare(`
                        UPDATE ContinuityOutfitsV2
                        SET
                            is_current = 1,
                            updated_at = ?
                        WHERE id = ?
                    `).run(
                        updatedAt,
                        outfit.id
                    );
                }
            );

        select();

        return this.getById(
            outfit.id
        );
    }

    delete(
        outfitId
    ) {
        return db.prepare(`
            DELETE FROM ContinuityOutfitsV2
            WHERE id = ?
        `).run(
            outfitId
        );
    }

}

module.exports =
    new OutfitRepository();
