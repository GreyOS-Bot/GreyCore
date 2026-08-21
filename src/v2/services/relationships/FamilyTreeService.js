const CATEGORY_ORDER = [
    "grandparents",
    "parents",
    "partners",
    "siblings",
    "children",
    "grandchildren",
    "extended"
];

const CATEGORY_LABELS = Object.freeze({
    grandparents: "⬆️ Grands-parents",
    parents: "👤 Parents",
    partners: "💍 Partenaire(s)",
    siblings: "🫂 Fratrie",
    children: "⬇️ Enfants",
    grandchildren: "🌱 Petits-enfants",
    extended: "🌿 Famille élargie"
});

class FamilyTreeService {

    build({
        continuityId,
        relationships
    }) {
        const groups = new Map(
            CATEGORY_ORDER.map(
                category => [
                    category,
                    []
                ]
            )
        );

        for (const relationship of relationships || []) {
            const category =
                getCategory(
                    relationship,
                    continuityId
                );

            if (!category) {
                continue;
            }

            groups.get(category).push({
                id: relationship.id,
                characterId:
                    relationship.otherCharacterId,
                continuityId:
                    relationship.otherContinuityId,
                name:
                    relationship.otherCharacterName,
                label:
                    categoryMemberLabel(category, relationship.displayLabel),
                note:
                    relationship.note || null
            });
        }

        return CATEGORY_ORDER
            .map(category => ({
                key: category,
                label: CATEGORY_LABELS[category],
                members: uniqueAndSort(
                    groups.get(category)
                )
            }))
            .filter(
                group => group.members.length > 0
            );
    }

    buildNetwork({ continuityId, directRelationships, allRelationships }) {
        const grouped = new Map(this.build({
            continuityId,
            relationships: directRelationships
        }).map(group => [group.key, [...group.members]]));
        const nodes = new Map();
        const parents = new Map();
        const siblings = new Map();

        const addNode = (id, characterId, name) => {
            if (id && !nodes.has(String(id))) nodes.set(String(id), {
                continuityId: String(id),
                characterId,
                name: name || "Personnage"
            });
        };
        const connect = (map, from, to) => {
            if (!from || !to) return;
            const values = map.get(String(from)) || new Set();
            values.add(String(to));
            map.set(String(from), values);
        };

        for (const relation of allRelationships || []) {
            const a = String(relation.continuity_a_id);
            const b = String(relation.continuity_b_id);
            addNode(a, relation.character_a_id, relation.character_a_name);
            addNode(b, relation.character_b_id, relation.character_b_name);
            if (relation.key === "parent") connect(parents, a, b);
            if (["sibling", "half_sibling"].includes(relation.key)) {
                connect(siblings, a, b);
                connect(siblings, b, a);
            }
        }

        for (const children of parents.values()) {
            const list = [...children];
            for (const left of list) for (const right of list) {
                if (left !== right) connect(siblings, left, right);
            }
        }

        const root = String(continuityId);
        const parentIds = [...parents.entries()]
            .filter(([, children]) => children.has(root))
            .map(([parentId]) => parentId);
        const childIds = [...(parents.get(root) || [])];
        const siblingIds = [...(siblings.get(root) || [])];
        const grandparentIds = parentIds.flatMap(parentId => [...parents.entries()]
            .filter(([, children]) => children.has(parentId))
            .map(([id]) => id));
        const grandchildIds = childIds.flatMap(childId => [...(parents.get(childId) || [])]);
        const uncleAuntIds = parentIds.flatMap(parentId => [...(siblings.get(parentId) || [])]);
        const nephewNieceIds = siblingIds.flatMap(siblingId => [...(parents.get(siblingId) || [])]);
        const cousinIds = uncleAuntIds.flatMap(id => [...(parents.get(id) || [])]);

        const addInferred = (category, ids, label) => {
            const members = grouped.get(category) || [];
            for (const id of new Set(ids)) {
                if (id === root) continue;
                const node = nodes.get(String(id));
                if (!node) continue;
                members.push({
                    id: `inferred:${category}:${root}:${id}`,
                    characterId: node.characterId,
                    continuityId: node.continuityId,
                    name: node.name,
                    label,
                    note: "Déduit automatiquement des relations familiales"
                });
            }
            grouped.set(category, uniqueAndSort(members));
        };

        addInferred("parents", parentIds, "Parent de");
        addInferred("children", childIds, "Enfant de");
        addInferred("siblings", siblingIds, "Frère/Sœur de");
        addInferred("grandparents", grandparentIds, "Grand-parent de");
        addInferred("grandchildren", grandchildIds, "Petit-enfant de");
        addInferred("extended", uncleAuntIds, "Oncle/Tante de");
        addInferred("extended", nephewNieceIds, "Neveu/Nièce de");
        addInferred("extended", cousinIds, "Cousin·e de");

        return CATEGORY_ORDER.map(category => ({
            key: category,
            label: CATEGORY_LABELS[category],
            members: uniqueAndSort(grouped.get(category) || [])
        })).filter(group => group.members.length);
    }

}

function categoryMemberLabel(category, fallback) {
    return ({
        grandparents: "Grand-parent de",
        parents: "Parent de",
        partners: "Partenaire de",
        siblings: "Frère/Sœur de",
        children: "Enfant de",
        grandchildren: "Petit-enfant de"
    })[category] || fallback;
}

function getCategory(
    relationship,
    continuityId
) {
    const isCharacterA =
        String(
            relationship.continuity_a_id
        ) === String(continuityId);

    switch (relationship.key) {
        case "parent":
            return isCharacterA
                ? "children"
                : "parents";

        case "grandparent":
            return isCharacterA
                ? "grandchildren"
                : "grandparents";

        case "sibling":
        case "half_sibling":
            return "siblings";

        case "spouse":
        case "fiance":
        case "couple":
        case "polyamorous":
        case "polyamorous_relationship":
            return "partners";

        case "cousin":
        case "uncle_aunt":
        case "nephew_niece":
        case "godparent":
        case "godchild":
        case "sibling_in_law":
        case "stepparent":
            return "extended";

        default:
            return looksLikeFamilyRelationship(
                relationship
            )
                ? "extended"
                : null;
    }
}

function looksLikeFamilyRelationship(
    relationship
) {
    const source = [
        relationship.key,
        relationship.displayLabel,
        relationship.label_a_to_b,
        relationship.label_b_to_a
    ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");

    return /parent|mère|mere|père|pere|enfant|frère|frere|sœur|soeur|sibling|demi|cousin|oncle|tante|grand-parent|grandparent|neveu|nièce|niece|filleul|filleule|marraine|parrain|godparent|godchild|marié|marie|fiancé|fiance|époux|epoux|conjoint|partenaire/.test(
        source
    );
}

function uniqueAndSort(members) {
    const unique = new Map();

    for (const member of members) {
        const key = [
            member.characterId,
            member.label
        ].join(":");

        if (!unique.has(key)) {
            unique.set(key, member);
        }
    }

    return Array.from(
        unique.values()
    ).sort(
        (left, right) => String(
            left.name
        ).localeCompare(
            String(right.name),
            "fr",
            {
                sensitivity: "base"
            }
        )
    );
}

const service = new FamilyTreeService();

module.exports = service;
module.exports.FamilyTreeService =
    FamilyTreeService;
