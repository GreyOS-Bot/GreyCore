const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const familyTreeImageRenderer =
    require(
        "../src/v2/services/relationships/FamilyTreeImageRenderer"
    );

test(
    "le renderer produit une image PNG pour un arbre généalogique",
    () => {
        const image =
            familyTreeImageRenderer.render({
                characterName:
                    "Alba & Reya",
                tree: [
                    {
                        key: "parents",
                        members: [
                            {
                                id: "parent",
                                name: "Mère <inconnue>",
                                label: "Enfant de"
                            }
                        ]
                    },
                    {
                        key: "children",
                        members: [
                            {
                                id: "child",
                                name: "Lina",
                                label: "Parent de"
                            }
                        ]
                    }
                ]
            });

        assert.equal(
            Buffer.isBuffer(image),
            true
        );
        assert.deepEqual(
            image.subarray(0, 8),
            Buffer.from([
                137,
                80,
                78,
                71,
                13,
                10,
                26,
                10
            ])
        );
        assert.ok(image.length > 1_000);
    }
);
