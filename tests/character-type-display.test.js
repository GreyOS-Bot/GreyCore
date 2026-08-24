const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "chaque type de personnage possède le bon libellé de fiche",
    () => {
        const catalog =
            require(
                "../src/v2/core/character/CharacterTypeCatalog"
            );

        const expectedLabels = {
            personnage_joue:
                "PJ",
            pj_masque:
                "PJ masqué",
            animal:
                "Animal",
            pnj:
                "PNJ",
            random:
                "Random",
            pnj_reserve:
                "PNJ réservé",
            reserve_staff:
                "Réservé staff"
        };

        for (
            const [
                type,
                label
            ]
            of Object.entries(
                expectedLabels
            )
        ) {
            assert.equal(
                catalog
                    .getDisplayLabel(
                        type
                    ),
                label
            );
        }
    }
);

test(
    "un personnage créé comme PNJ apparaît comme PNJ sur sa fiche",
    () => {
        const character = {
            id:
                "character-pnj",
            proxy_name:
                "Gardien",
            character_type:
                "pnj",
            is_archived:
                0
        };
        const continuity = {
            id:
                "continuity-pnj",
            character_id:
                character.id,
            name:
                "GreyOS",
            firstname:
                "Morgan",
            lastname:
                "Stone",
            age:
                34
        };

        stubModule(
            "src/v2/repositories/DashboardRepository.js",
            {}
        );
        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () =>
                        character
            }
        );
        stubModule(
            "src/v2/managers/ContinuityV2Manager.js",
            {
                getById:
                    () =>
                        continuity
            }
        );
        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getByContinuity:
                    () =>
                        []
            }
        );
        stubModule(
            "src/v2/managers/ProfileV2Manager.js",
            {
                get:
                    () =>
                        null
            }
        );
        stubModule(
            "src/v2/managers/RelationshipV2Manager.js",
            {
                getForContinuity:
                    () =>
                        []
            }
        );
        stubModule(
            "src/v2/managers/EncounterV2Manager.js",
            {
                getForContinuity:
                    () =>
                        []
            }
        );
        stubModule(
            "src/v2/managers/StateV2Manager.js",
            {
                getActiveStates:
                    () =>
                        []
            }
        );

        clearModule(
            "../src/v2/services/dashboard/CharacterDashboardManager"
        );

        const dashboardManager =
            require(
                "../src/v2/services/dashboard/CharacterDashboardManager"
            );

        const dashboard =
            dashboardManager
                .getDashboardData(
                    character.id,
                    {
                        continuityId:
                            continuity.id
                    }
                );

        assert.equal(
            dashboard.character
                .character_type,
            "pnj"
        );
        assert.equal(
            dashboard.character
                .is_npc,
            true
        );

        assert.equal(
            dashboard.character
                .display_name,
            "Morgan"
        );

        const page =
            require(
                "../src/v2/pages/character/CharacterDashboardPage"
            );
        const view =
            page.build(
                dashboard.character
            );
        const description =
            view.embeds[0]
                .data
                .description;

        assert.match(
            description,
            /🎭 PNJ/
        );
        assert.doesNotMatch(
            description,
            /🎭 PJ(?:\s|$)/
        );
    }
);

function clearModule(
    modulePath
) {
    const resolved =
        require.resolve(
            modulePath
        );

    delete require.cache[
        resolved
    ];
}
test("la commande de création Discord propose aussi Animal et PJ masqué", () => {
    const command = require("../src/commands/personnage").data.toJSON();
    const create = command.options.find(option => option.name === "creer");
    const type = create.options.find(option => option.name === "type");
    const choices = new Map(type.choices.map(choice => [choice.value, choice.name]));

    assert.equal(choices.get("pj_masque"), "PJ masqué");
    assert.equal(choices.get("animal"), "Animal");
});
test("la commande propose une recherche rapide pour modifier le type", () => {
    const command = require("../src/commands/personnage").data.toJSON();
    const typeCommand = command.options.find(option => option.name === "type");
    assert.ok(typeCommand);
    assert.equal(typeCommand.options.find(option => option.name === "personnage").autocomplete, true);
    assert.deepEqual(
        typeCommand.options.find(option => option.name === "nouveau_type").choices.map(choice => choice.value),
        ["personnage_joue", "pj_masque", "animal", "pnj", "random", "pnj_reserve", "reserve_staff"]
    );
});
