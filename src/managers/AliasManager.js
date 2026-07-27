const db = require("../database/database");

class AliasManager {
    addAlias(guildId, characterId, alias) {
        const normalizedAlias = alias.trim();

        const characterNameExists = db.prepare(`
            SELECT id
            FROM Characters
            WHERE guild_id = ?
            AND LOWER(name) = LOWER(?)
        `).get(guildId, normalizedAlias);

        if (characterNameExists) {
            throw new Error("Cet alias est déjà utilisé comme nom de personnage.");
        }

        const aliasExists = db.prepare(`
            SELECT id
            FROM CharacterAliases
            WHERE LOWER(alias) = LOWER(?)
        `).get(normalizedAlias);

        if (aliasExists) {
            throw new Error("Cet alias est déjà utilisé.");
        }

        db.prepare(`
            INSERT INTO CharacterAliases (
                character_id,
                alias,
                created_at
            )
            VALUES (?, ?, ?)
        `).run(
            characterId,
            normalizedAlias,
            new Date().toISOString()
        );

        return normalizedAlias;
    }

    removeAlias(characterId, alias) {
        db.prepare(`
            DELETE FROM CharacterAliases
            WHERE character_id = ?
            AND LOWER(alias) = LOWER(?)
        `).run(characterId, alias.trim());
    }

    getAliases(characterId) {
        return db.prepare(`
            SELECT *
            FROM CharacterAliases
            WHERE character_id = ?
            ORDER BY alias ASC
        `).all(characterId);
    }

    findCharacterIdByAlias(alias) {
        const row = db.prepare(`
            SELECT character_id
            FROM CharacterAliases
            WHERE LOWER(alias) = LOWER(?)
        `).get(alias.trim());

        return row?.character_id || null;
    }
}

module.exports = new AliasManager();