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
                    relationship.displayLabel,
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

    return /parent|mère|mere|père|pere|enfant|frère|frere|sœur|soeur|sibling|demi|cousin|oncle|tante|grand-parent|grandparent|neveu|nièce|niece|marraine|parrain|godparent|marié|marie|fiancé|fiance|époux|epoux|conjoint|partenaire/.test(
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
