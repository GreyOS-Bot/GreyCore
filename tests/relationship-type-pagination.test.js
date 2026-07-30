const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createTypeSelection
} = require(
    "../src/v2/interactions/relationships/RelationshipViewFactory"
);

test(
    "la selection des types de relation affiche toutes les pages",
    () => {
        const relationshipTypes = Array.from(
            {
                length: 27
            },
            (_, index) => ({
                id: index + 1,
                label_a_to_b:
                    `Type ${index + 1}`,
                label_b_to_a:
                    `Type ${index + 1}`,
                is_symmetric: 1
            })
        );

        const firstPage = createTypeSelection({
            characterId: "character-a",
            otherCharacterId: "character-b",
            relationshipTypes
        });
        const secondPage = createTypeSelection({
            characterId: "character-a",
            otherCharacterId: "character-b",
            relationshipTypes,
            page: 1
        });

        assert.equal(
            firstPage.components[0]
                .toJSON()
                .components[0]
                .options.length,
            25
        );
        assert.equal(
            firstPage.components.length,
            3
        );
        assert.equal(
            firstPage.components[1]
                .toJSON()
                .components[2]
                .custom_id,
            "v2rtp:character-a:character-b:1"
        );
        assert.equal(
            secondPage.components[0]
                .toJSON()
                .components[0]
                .options.length,
            2
        );
        assert.equal(
            secondPage.components[0]
                .toJSON()
                .components[0]
                .options[0]
                .value,
            "character-b:26"
        );
    }
);
