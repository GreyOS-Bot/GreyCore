const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la page d’arbre joint une image et la nettoie à la navigation",
    async () => {
        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getDashboardData: () => ({
                    character: {
                        id: "character",
                        proxy_name: "Alba",
                        avatar_url: null
                    },
                    continuity: {
                        id: "continuity",
                        firstname: "Alba"
                    }
                })
            }
        );

        stubModule(
            "src/v2/managers/RelationshipV2Manager.js",
            {
                getFamilyTree: () => [
                    {
                        key: "parents",
                        members: [
                            {
                                id: "parent",
                                name: "Morgane",
                                label: "Enfant de"
                            }
                        ]
                    }
                ]
            }
        );

        stubModule(
            "src/v2/services/relationships/FamilyTreeImageRenderer.js",
            {
                render: () => Buffer.from("png")
            }
        );

        const pagePath =
            require.resolve(
                "../src/v2/pages/character/CharacterFamilyTreePage"
            );

        delete require.cache[pagePath];

        const page =
            require(
                "../src/v2/pages/character/CharacterFamilyTreePage"
            );

        let response = null;

        await page.execute({
            guildId: "guild",
            update: async payload => {
                response = payload;
            }
        }, "character");

        assert.equal(
            response.files[0].name,
            "greycore-arbre-genealogique.png"
        );
        assert.deepEqual(
            response.attachments,
            []
        );
        assert.equal(
            response.embeds[0]
                .toJSON()
                .image
                .url,
            "attachment://greycore-arbre-genealogique.png"
        );
    }
);
