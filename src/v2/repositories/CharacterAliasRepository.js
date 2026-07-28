const db =
    require(
        "../../database/database"
    );

class CharacterAliasRepository {

    getForCharacter(characterId) {
        return db.prepare(`
            SELECT *
            FROM CharacterAliasesV2
            WHERE character_id = ?
            ORDER BY alias COLLATE NOCASE ASC
        `).all(characterId);
    }

    getForOwnerByAlias(
        ownerUserId,
        alias
    ) {
        return db.prepare(`
            SELECT characterAlias.*
            FROM CharacterAliasesV2 AS characterAlias
            JOIN CharactersV2 AS character
                ON character.id = characterAlias.character_id
            WHERE character.owner_user_id = ?
            AND LOWER(characterAlias.alias) = LOWER(?)
            LIMIT 1
        `).get(
            ownerUserId,
            alias
        );
    }

    create({
        characterId,
        alias,
        createdAt
    }) {
        const result = db.prepare(`
            INSERT INTO CharacterAliasesV2 (
                character_id,
                alias,
                created_at
            )
            VALUES (?, ?, ?)
        `).run(
            characterId,
            alias,
            createdAt
        );

        return db.prepare(`
            SELECT *
            FROM CharacterAliasesV2
            WHERE id = ?
        `).get(result.lastInsertRowid);
    }

    delete(
        characterId,
        aliasId
    ) {
        return db.prepare(`
            DELETE FROM CharacterAliasesV2
            WHERE id = ?
            AND character_id = ?
        `).run(
            aliasId,
            characterId
        );
    }

}

module.exports =
    new CharacterAliasRepository();
