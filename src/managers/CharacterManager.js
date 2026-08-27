const db = require("../database/database");
const Character = require("../models/Character");
const { v4: uuidv4 } = require("uuid");

class CharacterManager {
    getCharactersByOwner(guildId, ownerId) {
        const rows = db.prepare(`
            SELECT *
            FROM Characters
            WHERE guild_id = ?
            AND owner_id = ?
            ORDER BY name ASC
        `).all(guildId, ownerId);

        return rows.map(row => this.mapRowToCharacter(row));
    }

    getCharactersByOwnerGlobal(ownerId) {
    const rows = db.prepare(`
        SELECT *
        FROM Characters
        WHERE owner_id = ?
        AND is_active = 1
        ORDER BY name ASC
    `).all(ownerId);

    return rows.map(
        row =>
            this.mapRowToCharacter(row)
    );
}

    getCharactersByGuild(guildId) {
    const rows = db.prepare(`
        SELECT *
        FROM Characters
        WHERE guild_id = ?
        ORDER BY name ASC
    `).all(guildId);

    return rows.map(row => this.mapRowToCharacter(row));
}

    searchCharactersByGuild(
        guildId,
        focused,
        limit = 25
    ) {
        const normalizedLimit =
            Math.max(
                0,
                Math.min(
                    25,
                    Number(limit) || 0
                )
            );

        if (!normalizedLimit) {
            return [];
        }

        const focusedValue =
            String(focused || "")
                .toLowerCase();
        const pageSize =
            100;
        const results = [];
        let lastName = null;

        const readPage =
            db.prepare(`
                SELECT *
                FROM Characters
                WHERE guild_id = ?
                AND (
                    ? IS NULL
                    OR name > ?
                )
                ORDER BY name ASC
                LIMIT ?
            `);

        while (results.length < normalizedLimit) {
            const rows =
                readPage.all(
                    guildId,
                    lastName,
                    lastName,
                    pageSize
                );

            if (!rows.length) {
                break;
            }

            for (const row of rows) {
                if (
                    row.name
                        .toLowerCase()
                        .includes(
                            focusedValue
                        )
                ) {
                    results.push(
                        this.mapRowToCharacter(
                            row
                        )
                    );

                    if (
                        results.length ===
                            normalizedLimit
                    ) {
                        break;
                    }
                }
            }

            lastName =
                rows[rows.length - 1]
                    .name;

            if (rows.length < pageSize) {
                break;
            }
        }

        return results;
    }

getCharactersAvailableForUser(
    guildId,
    ownerId
) {
    const rows = db.prepare(`
        SELECT *
        FROM Characters

        WHERE is_active = 1

        AND (
            owner_id = ?

            OR (
                guild_id = ?
                AND visibility = 'public'
            )
        )

        ORDER BY
            CASE
                WHEN owner_id = ?
                THEN 0
                ELSE 1
            END,

            name COLLATE NOCASE ASC
    `).all(
        ownerId,
        guildId,
        ownerId
    );

    /*
     * Un même personnage peut éventuellement
     * exister dans plusieurs anciennes installations.
     * On évite les doublons nom + propriétaire.
     */
    const uniqueCharacters =
        new Map();

    for (const row of rows) {
        const key = [
            row.owner_id,
            row.name.toLowerCase()
        ].join(":");

        if (!uniqueCharacters.has(key)) {
            uniqueCharacters.set(
                key,
                this.mapRowToCharacter(row)
            );
        }
    }

    return Array.from(
        uniqueCharacters.values()
    );
}

    getCharacterByName(guildId, ownerId, name) {
        const row = db.prepare(`
            SELECT *
            FROM Characters
            WHERE guild_id = ?
            AND owner_id = ?
            AND name = ?
        `).get(guildId, ownerId, name);

        if (!row) return null;

        return this.mapRowToCharacter(row);
    }

    getCharacterById(id) {
        const row = db.prepare(`
            SELECT *
            FROM Characters
            WHERE id = ?
        `).get(id);

        if (!row) return null;

        return this.mapRowToCharacter(row);
    }

    getCharacterForProxy(
    guildId,
    ownerId,
    trigger
) {
    /*
     * On cherche d’abord parmi tous les personnages
     * appartenant à l’utilisateur, quel que soit
     * leur serveur d’origine.
     */
    let row = db.prepare(`
        SELECT *
        FROM Characters

        WHERE owner_id = ?
        AND LOWER(name) = LOWER(?)
        AND is_active = 1

        ORDER BY
            CASE
                WHEN guild_id = ?
                THEN 0
                ELSE 1
            END,

            created_at ASC

        LIMIT 1
    `).get(
        ownerId,
        trigger,
        guildId
    );

    /*
     * Si aucun nom direct ne correspond,
     * on recherche un alias appartenant
     * à l’un des personnages de l’utilisateur.
     */
    if (!row) {
        const aliasRow =
            db.prepare(`
                SELECT
                    character.id

                FROM CharacterAliases alias

                JOIN Characters character
                    ON character.id =
                        alias.character_id

                WHERE LOWER(alias.alias) =
                    LOWER(?)

                AND character.owner_id = ?
                AND character.is_active = 1

                ORDER BY
                    CASE
                        WHEN character.guild_id = ?
                        THEN 0
                        ELSE 1
                    END,

                    character.created_at ASC

                LIMIT 1
            `).get(
                trigger,
                ownerId,
                guildId
            );

        if (aliasRow) {
            row = db.prepare(`
                SELECT *
                FROM Characters
                WHERE id = ?
            `).get(
                aliasRow.id
            );
        }
    }

    /*
     * En dernier recours, on autorise un personnage
     * public du serveur actuel.
     */
    if (!row) {
        row = db.prepare(`
            SELECT *
            FROM Characters

            WHERE guild_id = ?
            AND LOWER(name) = LOWER(?)
            AND visibility = 'public'
            AND is_active = 1

            LIMIT 1
        `).get(
            guildId,
            trigger
        );
    }

    if (!row) {
        return null;
    }

    return this.mapRowToCharacter(
        row
    );
}

    createCharacter(data) {
    const existingCharacter = db.prepare(`
        SELECT id
        FROM Characters
        WHERE guild_id = ?
        AND name = ?
    `).get(data.guildId, data.name);

    if (existingCharacter) {
        throw new Error("Un personnage portant ce nom existe déjà.");
    }

    const now = new Date().toISOString();

    const character = new Character({
        id: `char_${uuidv4()}`,
        guildId: data.guildId,
        ownerId: data.ownerId,
        name: data.name,
        avatar: data.avatar,
        color: data.color || "#2B2D31",
        visibility: data.visibility || "private",
        type: data.type || "personnage_joue",
        status: data.status || "pending",
        isActive: true,
        createdAt: now,
        updatedAt: now
    });

    db.prepare(`
        INSERT INTO Characters (
            id,
            guild_id,
            owner_id,
            name,
            avatar,
            color,
            visibility,
            type,
            status,
            is_active,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        character.id,
        character.guildId,
        character.ownerId,
        character.name,
        character.avatar,
        character.color,
        character.visibility,
        character.type,
        character.status,
        character.isActive ? 1 : 0,
        character.createdAt,
        character.updatedAt
    );

    return character;
}
updateAvatar(characterId, avatarUrl) {
    const character = this.getCharacterById(characterId);

    if (!character) {
        throw new Error("Personnage introuvable.");
    }

    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
        // Mise à jour V1.
        db.prepare(`
            UPDATE Characters
            SET avatar = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            avatarUrl,
            now,
            characterId
        );

        // Synchronisation du personnage global V2.
        db.prepare(`
            UPDATE CharactersV2
            SET avatar_url = ?,
                updated_at = ?
            WHERE owner_user_id = (
                SELECT id
                FROM UsersV2
                WHERE discord_user_id = ?
            )
            AND LOWER(proxy_name) = LOWER(?)
        `).run(
            avatarUrl,
            now,
            character.ownerId,
            character.name
        );
    });

    transaction();

    return this.getCharacterById(characterId);
}
    deleteCharacter(characterId) {
        db.prepare(`
            DELETE FROM CharacterProfiles
            WHERE character_id = ?
        `).run(characterId);

        db.prepare(`
            DELETE FROM Characters
            WHERE id = ?
        `).run(characterId);
    }

    updateValidation(characterId, data) {
    const now = new Date().toISOString();
    
    db.prepare(`
        UPDATE Characters
        SET
            status = ?,
            validated_by = ?,
            validated_at = ?,
            rejection_reason = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        data.status,
        data.validatedBy ?? null,
        data.validatedAt ?? now,
        data.rejectionReason ?? null,
        now,
        characterId
    );

    const updatedCharacter = this.getCharacterById(characterId);

    console.log(
        "🧪 Motif relu depuis la base :",
        updatedCharacter?.rejectionReason
    );

    return updatedCharacter;
}

resetValidation(characterId) {
    const now = new Date().toISOString();

    db.prepare(`
        UPDATE Characters
        SET
            status = 'pending',
            validated_by = NULL,
            validated_at = NULL,
            rejection_reason = NULL,
            updated_at = ?
        WHERE id = ?
    `).run(
        now,
        characterId
    );

    return this.getCharacterById(characterId);
}

    mapRowToCharacter(row) {
        return new Character({
            id: row.id,
            guildId: row.guild_id,
            ownerId: row.owner_id,
            name: row.name,
            avatar: row.avatar,
            color: row.color,
            visibility: row.visibility || "private",
            createdAt: row.created_at,
            type: row.type || "personnage_joue",
            status: row.status || "pending",
            validatedBy: row.validated_by || null,
            validatedAt: row.validated_at || null,
            rejectionReason: row.rejection_reason || null,
            isActive: row.is_active === 1,
            updatedAt: row.updated_at
        });
    }
}

module.exports = new CharacterManager();
