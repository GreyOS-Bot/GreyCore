const db = require("../database/database");
const StateType = require("../models/StateType");

class StateManager {
    mapRowToStateType(row) {
        if (!row) return null;

        return new StateType({
            id: row.id,
            guildId: row.guild_id,
            name: row.name,
            emoji: row.emoji,
            color: row.color,
            createdBy: row.created_by,
            createdAt: row.created_at
        });
    }

    createStateType(data) {
        const name = data.name.trim();

        const existing = db.prepare(`
            SELECT id
            FROM StateTypes
            WHERE guild_id = ?
            AND LOWER(name) = LOWER(?)
        `).get(
            data.guildId,
            name
        );

        if (existing) {
            throw new Error(
                "Un type d’état portant ce nom existe déjà sur ce serveur."
            );
        }

        const now = new Date().toISOString();

        const result = db.prepare(`
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
            data.guildId,
            name,
            data.emoji?.trim() || null,
            data.color?.trim() || "#2B2D31",
            data.createdBy,
            now
        );

        return this.getStateTypeById(result.lastInsertRowid);
    }

    getStateTypeById(id) {
        const row = db.prepare(`
            SELECT *
            FROM StateTypes
            WHERE id = ?
        `).get(id);

        return this.mapRowToStateType(row);
    }

    getStateTypesByGuild(guildId) {
        const rows = db.prepare(`
            SELECT *
            FROM StateTypes
            WHERE guild_id = ?
            ORDER BY name ASC
        `).all(guildId);

        return rows.map(row => this.mapRowToStateType(row));
    }

addStateToCharacter(data) {

const existing = db.prepare(`
    SELECT id
    FROM CharacterStates
    WHERE character_id = ?
      AND state_type_id = ?
      AND ended_at IS NULL
`).get(
    data.characterId,
    data.stateTypeId
);

if (existing) {
    throw new Error(
        "Ce personnage possède déjà cet état."
    );
}

    const now = new Date().toISOString();

    const result = db.prepare(`
        INSERT INTO CharacterStates (
            guild_id,
            character_id,
            state_type_id,
            note,
            started_at,
            created_by,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.guildId,
        data.characterId,
        data.stateTypeId,
        data.note ?? null,
        data.startedAt ?? now,
        data.createdBy,
        now,
        now
    );

    return result.lastInsertRowid;
}

getActiveStates(characterId) {

    return db.prepare(`
        SELECT
            cs.*,
            st.name,
            st.emoji,
            st.color
        FROM CharacterStates cs

        JOIN StateTypes st
            ON st.id = cs.state_type_id

        WHERE
            cs.character_id = ?
            AND cs.ended_at IS NULL

        ORDER BY
            cs.started_at DESC
    `).all(characterId);

}

endState(stateId) {

    db.prepare(`
        UPDATE CharacterStates
        SET
            ended_at = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        new Date().toISOString(),
        new Date().toISOString(),
        stateId
    );

}

countStatesUsingType(guildId, stateTypeId) {
    const row = db.prepare(`
        SELECT COUNT(*) AS count
        FROM CharacterStates
        WHERE guild_id = ?
        AND state_type_id = ?
    `).get(
        guildId,
        stateTypeId
    );

    return row?.count || 0;
}

deleteStateType(guildId, stateTypeId) {
    const stateType = db.prepare(`
        SELECT *
        FROM StateTypes
        WHERE id = ?
        AND guild_id = ?
    `).get(
        stateTypeId,
        guildId
    );

    if (!stateType) {
        throw new Error(
            "Ce type d’état est introuvable sur ce serveur."
        );
    }

    db.prepare(`
        DELETE FROM StateTypes
        WHERE id = ?
        AND guild_id = ?
    `).run(
        stateTypeId,
        guildId
    );

    return this.mapRowToStateType(stateType);
}

installDefaultStateTypes(guildId, createdBy) {
    const defaultTypes = [
        {
            name: "Blessé·e",
            emoji: "🩹",
            color: "#E67E22"
        },
        {
            name: "Gravement blessé·e",
            emoji: "🩸",
            color: "#C0392B"
        },
        {
            name: "Hospitalisé·e",
            emoji: "🏥",
            color: "#3498DB"
        },
        {
            name: "En convalescence",
            emoji: "🛏️",
            color: "#95A5A6"
        },
        {
            name: "Malade",
            emoji: "🤒",
            color: "#2ECC71"
        },
        {
            name: "Inconscient·e",
            emoji: "😵",
            color: "#34495E"
        },
        {
            name: "Enceinte",
            emoji: "🤰",
            color: "#E91E63"
        },
        {
            name: "Fatigué·e",
            emoji: "😴",
            color: "#7F8C8D"
        },
        {
            name: "Ivre",
            emoji: "🍺",
            color: "#F39C12"
        },
        {
            name: "Sous substances",
            emoji: "💊",
            color: "#9B59B6"
        },
        {
            name: "Traumatisé·e",
            emoji: "🫥",
            color: "#5D6D7E"
        },
        {
            name: "En deuil",
            emoji: "🕯️",
            color: "#2C3E50"
        },
        {
            name: "Amnésique",
            emoji: "❔",
            color: "#8E44AD"
        },
        {
            name: "Disparu·e",
            emoji: "🔍",
            color: "#616A6B"
        },
        {
            name: "Recherché·e",
            emoji: "🚨",
            color: "#E74C3C"
        },
        {
            name: "En garde à vue",
            emoji: "🚔",
            color: "#2980B9"
        },
        {
            name: "Emprisonné·e",
            emoji: "⛓️",
            color: "#566573"
        },
        {
            name: "Sous surveillance",
            emoji: "👁️",
            color: "#D35400"
        },
        {
            name: "En cavale",
            emoji: "🏃",
            color: "#A93226"
        },
        {
            name: "Séquestré·e",
            emoji: "🔒",
            color: "#641E16"
        }
    ];

    const now = new Date().toISOString();

    const insert = db.prepare(`
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

    const installAll = db.transaction(() => {
        for (const state of defaultTypes) {
            insert.run(
                guildId,
                state.name,
                state.emoji,
                state.color,
                createdBy,
                now
            );
        }
    });

    installAll();

    return this.getStateTypesByGuild(guildId);
}

}

module.exports = new StateManager();