const db = require("../database/database");
const CharacterEncounter = require("../models/CharacterEncounter");

class EncounterManager {
    mapRowToEncounter(row) {
        if (!row) return null;

        return new CharacterEncounter({
            id: row.id,
            guildId: row.guild_id,
            characterAId: row.character_a_id,
            characterBId: row.character_b_id,
            externalName: row.external_name,
            occurredAt: row.occurred_at,
            location: row.location,
            note: row.note,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }

    createEncounter(data) {
    const externalName =
        data.externalName?.trim() || null;

    const characterBId =
        data.characterBId || null;

    if (!characterBId && !externalName) {
        throw new Error(
            "Sélectionne un personnage ou renseigne un nom."
        );
    }

    if (
        characterBId &&
        data.characterAId === characterBId
    ) {
        throw new Error(
            "Un personnage ne peut pas se rencontrer lui-même."
        );
    }

    const characterA = db.prepare(`
        SELECT id
        FROM Characters
        WHERE id = ?
        AND guild_id = ?
    `).get(
        data.characterAId,
        data.guildId
    );

    if (!characterA) {
        throw new Error(
            "Le personnage principal est introuvable sur ce serveur."
        );
    }

    if (characterBId) {
        const characterB = db.prepare(`
            SELECT id
            FROM Characters
            WHERE id = ?
            AND guild_id = ?
        `).get(
            characterBId,
            data.guildId
        );

        if (!characterB) {
            throw new Error(
                "Le personnage rencontré est introuvable sur ce serveur."
            );
        }
    }

    const now = new Date().toISOString();

    const result = db.prepare(`
        INSERT INTO CharacterEncounters (
            guild_id,
            character_a_id,
            character_b_id,
            external_name,
            occurred_at,
            location,
            note,
            created_by,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.guildId,
        data.characterAId,
        characterBId,
        externalName,
        data.occurredAt || now,
        data.location?.trim() || null,
        data.note?.trim() || null,
        data.createdBy,
        now,
        now
    );

    return this.getEncounterById(
        result.lastInsertRowid
    );
}

deleteEncounter(encounterId) {
    const result = db.prepare(`
        DELETE FROM CharacterEncounters
        WHERE id = ?
    `).run(encounterId);

    if (result.changes === 0) {
        throw new Error("Rencontre introuvable.");
    }

    return true;
}

    getEncounterById(id) {
        const row = db.prepare(`
            SELECT *
            FROM CharacterEncounters
            WHERE id = ?
        `).get(id);

        return this.mapRowToEncounter(row);
    }

    getEncountersForCharacter(guildId, characterId) {
       const rows = db.prepare(`
    SELECT
        ce.*,
        a.name AS character_a_name,
        b.name AS character_b_name
    FROM CharacterEncounters ce

    JOIN Characters a
        ON a.id = ce.character_a_id

    LEFT JOIN Characters b
        ON b.id = ce.character_b_id

    WHERE ce.guild_id = ?
    AND (
        ce.character_a_id = ?
        OR ce.character_b_id = ?
    )

    ORDER BY ce.occurred_at DESC
`).all(
    guildId,
    characterId,
    characterId
);

        return rows.map(row => {
    const encounter = this.mapRowToEncounter(row);

    const isCharacterA =
        row.character_a_id === characterId;

    const isExternal =
        !row.character_b_id &&
        Boolean(row.external_name);

    return {
        ...encounter,

        otherCharacterId: isExternal
            ? null
            : isCharacterA
                ? row.character_b_id
                : row.character_a_id,

        otherCharacterName: isExternal
            ? row.external_name
            : isCharacterA
                ? row.character_b_name
                : row.character_a_name,

        isExternal
    };

});
    }
}

module.exports = new EncounterManager();

