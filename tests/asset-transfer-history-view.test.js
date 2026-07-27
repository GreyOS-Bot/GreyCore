const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const viewFactory =
    require(
        "../src/v2/interactions/assets/AssetViewFactory"
    );

test(
    "l’historique des biens affiche le cadeau, les deux personnages et le joueur",
    () => {
        const embed =
            viewFactory.transferHistory(
                {
                    id: 42,
                    name: "Stylo bic"
                },
                [
                    {
                        from_character_name: "Nelyne",
                        to_character_name: "Alba",
                        transferred_by: "33412153137990410",
                        created_at:
                            "2026-07-27T17:40:00.000Z",
                        note: "Un cadeau pour sa sœur."
                    }
                ]
            ).embeds[0].toJSON();

        assert.match(
            embed.title,
            /Stylo bic/
        );

        assert.match(
            embed.description,
            /Nelyne/
        );

        assert.match(
            embed.description,
            /Alba/
        );

        assert.match(
            embed.description,
            /<@33412153137990410>/
        );

        assert.match(
            embed.description,
            /cadeau pour sa sœur/
        );
    }
);

test(
    "l’historique vide explique qu’aucun transfert n’a eu lieu",
    () => {
        const embed =
            viewFactory.transferHistory(
                {
                    id: 42,
                    name: "Stylo bic"
                },
                []
            ).embeds[0].toJSON();

        assert.match(
            embed.description,
            /pas encore été transféré/
        );
    }
);
