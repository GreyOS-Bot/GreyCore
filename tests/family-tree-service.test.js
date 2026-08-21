const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const familyTreeService =
    require(
        "../src/v2/services/relationships/FamilyTreeService"
    );

test(
    "l’arbre généalogique classe les liens familiaux dans le bon sens",
    () => {
        const tree =
            familyTreeService.build({
                continuityId: "alba",
                relationships: [
                    relationship({
                        id: "parent",
                        key: "parent",
                        continuityAId: "parent",
                        continuityBId: "alba",
                        otherName: "Zoé",
                        label: "Enfant de"
                    }),
                    relationship({
                        id: "child",
                        key: "parent",
                        continuityAId: "alba",
                        continuityBId: "child",
                        otherName: "Milo",
                        label: "Parent de"
                    }),
                    relationship({
                        id: "sibling",
                        key: "sibling",
                        continuityAId: "alba",
                        continuityBId: "sibling",
                        otherName: "Éloïse",
                        label: "Sœur de"
                    }),
                    relationship({
                        id: "spouse",
                        key: "spouse",
                        continuityAId: "alba",
                        continuityBId: "spouse",
                        otherName: "Camil",
                        label: "Marié·e à"
                    }),
                    relationship({
                        id: "grandparent",
                        key: "grandparent",
                        continuityAId: "grandparent",
                        continuityBId: "alba",
                        otherName: "André",
                        label: "Petit-enfant de"
                    }),
                    relationship({
                        id: "friend",
                        key: "friend",
                        continuityAId: "alba",
                        continuityBId: "friend",
                        otherName: "Nora",
                        label: "Ami·e de"
                    })
                ]
            });

        assert.deepEqual(
            tree.map(group => [
                group.key,
                group.members.map(member => member.name)
            ]),
            [
                ["grandparents", ["André"]],
                ["parents", ["Zoé"]],
                ["partners", ["Camil"]],
                ["siblings", ["Éloïse"]],
                ["children", ["Milo"]]
            ]
        );
    }
);

test(
    "les types familiaux personnalisés restent visibles dans la famille élargie",
    () => {
        const tree =
            familyTreeService.build({
                continuityId: "alba",
                relationships: [
                    relationship({
                        id: "custom",
                        key: "marraine",
                        continuityAId: "alba",
                        continuityBId: "godchild",
                        otherName: "Lina",
                        label: "Marraine de"
                    })
                ]
            });

        assert.deepEqual(
            tree.map(group => group.key),
            ["extended"]
        );
        assert.equal(
            tree[0].members[0].name,
            "Lina"
        );
    }
);

test("l’arbre propage les liens familiaux à tous les personnages concernés", () => {
    const allRelationships = [
        rawRelationship("r1", "parent", "evelyn", "parent", "Evelyn", "Morgan"),
        rawRelationship("r2", "parent", "parent", "sloane", "Morgan", "Sloane"),
        rawRelationship("r3", "sibling", "parent", "tante", "Morgan", "Talia"),
        rawRelationship("r4", "parent", "tante", "cousine", "Talia", "Célia")
    ];
    const tree = familyTreeService.buildNetwork({
        continuityId: "sloane",
        directRelationships: [],
        allRelationships
    });
    const groups = Object.fromEntries(tree.map(group => [group.key, group.members]));
    assert.equal(groups.grandparents[0].name, "Evelyn");
    assert.equal(groups.grandparents[0].label, "Grand-parent de");
    assert.ok(groups.extended.some(member => member.name === "Talia" && member.label === "Oncle/Tante de"));
    assert.ok(groups.extended.some(member => member.name === "Célia" && member.label === "Cousin·e de"));
});

function relationship({
    id,
    key,
    continuityAId,
    continuityBId,
    otherName,
    label
}) {
    return {
        id,
        key,
        continuity_a_id: continuityAId,
        continuity_b_id: continuityBId,
        otherCharacterId: `character-${id}`,
        otherContinuityId:
            continuityAId === "alba"
                ? continuityBId
                : continuityAId,
        otherCharacterName: otherName,
        displayLabel: label
    };
}

function rawRelationship(id, key, continuityAId, continuityBId, nameA, nameB) {
    return {
        id,
        key,
        continuity_a_id: continuityAId,
        continuity_b_id: continuityBId,
        character_a_id: `character-${continuityAId}`,
        character_b_id: `character-${continuityBId}`,
        character_a_name: nameA,
        character_b_name: nameB
    };
}
