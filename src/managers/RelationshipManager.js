const db = require("../database/database");

class RelationshipManager {
    createRelationship(data) {
        if (data.characterAId === data.characterBId) {
            throw new Error(
                "Un personnage ne peut pas avoir une relation avec lui-même."
            );
        }

        const type = db.prepare(`
            SELECT *
            FROM RelationshipTypes
            WHERE id = ?
            AND guild_id = ?
        `).get(
            data.relationshipTypeId,
            data.guildId
        );

        if (!type) {
            throw new Error(
                "Type de relation introuvable sur ce serveur."
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

        const characterB = db.prepare(`
            SELECT id
            FROM Characters
            WHERE id = ?
            AND guild_id = ?
        `).get(
            data.characterBId,
            data.guildId
        );

        if (!characterA || !characterB) {
            throw new Error(
                "L’un des personnages est introuvable sur ce serveur."
            );
        }

        const existing = db.prepare(`
            SELECT id
            FROM CharacterRelationships
            WHERE guild_id = ?
            AND relationship_type_id = ?
            AND (
                (
                    character_a_id = ?
                    AND character_b_id = ?
                )
                OR
                (
                    character_a_id = ?
                    AND character_b_id = ?
                )
            )
        `).get(
            data.guildId,
            data.relationshipTypeId,
            data.characterAId,
            data.characterBId,
            data.characterBId,
            data.characterAId
        );

        if (existing) {
            throw new Error(
                "Cette relation existe déjà entre ces personnages."
            );
        }

        const result = db.prepare(`
            INSERT INTO CharacterRelationships (
                guild_id,
                character_a_id,
                character_b_id,
                relationship_type_id,
                created_by,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            data.guildId,
            data.characterAId,
            data.characterBId,
            data.relationshipTypeId,
            data.createdBy,
            new Date().toISOString()
        );

        return this.getRelationshipById(result.lastInsertRowid);
    }

    getRelationshipById(id) {
        return db.prepare(`
            SELECT
                cr.*,
                rt.key,
                rt.label_a_to_b,
                rt.label_b_to_a,
                rt.is_symmetric
            FROM CharacterRelationships cr
            JOIN RelationshipTypes rt
                ON rt.id = cr.relationship_type_id
            WHERE cr.id = ?
        `).get(id);
    }

    getRelationshipsForCharacter(guildId, characterId) {
        return db.prepare(`
            SELECT
                cr.*,
                rt.key,
                rt.label_a_to_b,
                rt.label_b_to_a,
                rt.is_symmetric,
                a.name AS character_a_name,
                b.name AS character_b_name
            FROM CharacterRelationships cr
            JOIN RelationshipTypes rt
                ON rt.id = cr.relationship_type_id
            JOIN Characters a
                ON a.id = cr.character_a_id
            JOIN Characters b
                ON b.id = cr.character_b_id
            WHERE cr.guild_id = ?
            AND (
                cr.character_a_id = ?
                OR cr.character_b_id = ?
            )
            ORDER BY cr.created_at ASC
        `).all(
            guildId,
            characterId,
            characterId
        );
    }

    deleteRelationship(relationshipId) {
        return db.prepare(`
            DELETE FROM CharacterRelationships
            WHERE id = ?
        `).run(relationshipId);
    }

getDisplayRelationships(guildId, characterId) {
    const relationships =
        this.getRelationshipsForCharacter(
            guildId,
            characterId
        );

    return relationships.map(relationship => {

        const isCharacterA =
            relationship.character_a_id === characterId;

        return {
            relationshipId: relationship.id,

            otherCharacterId: isCharacterA
                ? relationship.character_b_id
                : relationship.character_a_id,

            otherCharacterName: isCharacterA
                ? relationship.character_b_name
                : relationship.character_a_name,

            label: isCharacterA
                ? relationship.label_a_to_b
                : relationship.label_b_to_a
        };
    });
}

getRelationshipTypes(guildId) {

    return db.prepare(`
        SELECT *
        FROM RelationshipTypes
        WHERE guild_id = ?
        ORDER BY label_a_to_b
    `).all(guildId);

}

installDefaultRelationshipTypes(guildId) {
    const defaultTypes = [
        {
            key: "friend",
            labelAToB: "Ami·e de",
            labelBToA: "Ami·e de",
            isSymmetric: 1
        },
        {
            key: "best_friend",
            labelAToB: "Meilleur·e ami·e de",
            labelBToA: "Meilleur·e ami·e de",
            isSymmetric: 1
        },
        {
            key: "acquaintance",
            labelAToB: "Connaissance de",
            labelBToA: "Connaissance de",
            isSymmetric: 1
        },
        {
            key: "ally",
            labelAToB: "Allié·e de",
            labelBToA: "Allié·e de",
            isSymmetric: 1
        },
        {
            key: "rival",
            labelAToB: "Rival·e de",
            labelBToA: "Rival·e de",
            isSymmetric: 1
        },
        {
            key: "enemy",
            labelAToB: "Ennemi·e de",
            labelBToA: "Ennemi·e de",
            isSymmetric: 1
        },
        {
            key: "partner",
            labelAToB: "En couple avec",
            labelBToA: "En couple avec",
            isSymmetric: 1
        },
        {
            key: "sexfriend",
            labelAToB: "Sexfriend de",
            labelBToA: "Sexfriend de",
            isSymmetric: 1
        },
        {
            key: "polyamorous_relationship",
            labelAToB: "En relation polyamoureuse avec",
            labelBToA: "En relation polyamoureuse avec",
            isSymmetric: 1
        },
        {
            key: "spouse",
            labelAToB: "Marié·e à",
            labelBToA: "Marié·e à",
            isSymmetric: 1
        },
        {
            key: "fiance",
            labelAToB: "Fiancé·e à",
            labelBToA: "Fiancé·e à",
            isSymmetric: 1
        },
        {
            key: "ex",
            labelAToB: "Ex de",
            labelBToA: "Ex de",
            isSymmetric: 1
        },
        {
            key: "flirt",
            labelAToB: "Flirte avec",
            labelBToA: "Flirte avec",
            isSymmetric: 1
        },
        {
            key: "crush",
            labelAToB: "Attiré·e par",
            labelBToA: "Objet de l’attirance de",
            isSymmetric: 0
        },
        {
            key: "secret_love",
            labelAToB: "Amoureux·se en secret de",
            labelBToA: "Aimé·e en secret par",
            isSymmetric: 0
        },
        {
            key: "parent",
            labelAToB: "Parent de",
            labelBToA: "Enfant de",
            isSymmetric: 0
        },
        {
            key: "sibling",
            labelAToB: "Frère/Sœur de",
            labelBToA: "Frère/Sœur de",
            isSymmetric: 1
        },
        {
            key: "half_sibling",
            labelAToB: "Demi-frère/Demi-sœur de",
            labelBToA: "Demi-frère/Demi-sœur de",
            isSymmetric: 1
        },
        {
            key: "cousin",
            labelAToB: "Cousin·e de",
            labelBToA: "Cousin·e de",
            isSymmetric: 1
        },
        {
            key: "uncle_aunt",
            labelAToB: "Oncle/Tante de",
            labelBToA: "Neveu/Nièce de",
            isSymmetric: 0
        },
        {
            key: "grandparent",
            labelAToB: "Grand-parent de",
            labelBToA: "Petit-enfant de",
            isSymmetric: 0
        },
        {
            key: "mentor",
            labelAToB: "Mentor de",
            labelBToA: "Protégé·e de",
            isSymmetric: 0
        },
        {
            key: "boss",
            labelAToB: "Supérieur·e de",
            labelBToA: "Subordonné·e de",
            isSymmetric: 0
        },
        {
            key: "colleague",
            labelAToB: "Collègue de",
            labelBToA: "Collègue de",
            isSymmetric: 1
        },
        {
            key: "roommate",
            labelAToB: "Colocataire de",
            labelBToA: "Colocataire de",
            isSymmetric: 1
        },
        {
            key: "associate",
            labelAToB: "Associé·e de",
            labelBToA: "Associé·e de",
            isSymmetric: 1
        },
        {
            key: "protector",
            labelAToB: "Protecteur·rice de",
            labelBToA: "Protégé·e par",
            isSymmetric: 0
        },
        {
            key: "bodyguard",
            labelAToB: "Garde du corps de",
            labelBToA: "Protégé·e de",
            isSymmetric: 0
        },
        {
            key: "debtor",
            labelAToB: "Doit de l’argent à",
            labelBToA: "Créancier·ère de",
            isSymmetric: 0
        },
        {
            key: "informant",
            labelAToB: "Informateur·rice de",
            labelBToA: "Contact de",
            isSymmetric: 0
        },
        {
            key: "leader",
            labelAToB: "Dirige",
            labelBToA: "Sous les ordres de",
            isSymmetric: 0
        },
        {
            key: "kidnapper",
            labelAToB: "Ravisseur·se de",
            labelBToA: "Captif·ve de",
            isSymmetric: 0
        }
    ];

    const now = new Date().toISOString();

    const insert = db.prepare(`
        INSERT OR IGNORE INTO RelationshipTypes (
            guild_id,
            key,
            label_a_to_b,
            label_b_to_a,
            is_symmetric,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const installAll = db.transaction(() => {
        for (const type of defaultTypes) {
            insert.run(
                guildId,
                type.key,
                type.labelAToB,
                type.labelBToA,
                type.isSymmetric,
                now
            );
        }
    });

    installAll();

    return this.getRelationshipTypes(guildId);
}

}


module.exports = new RelationshipManager();
