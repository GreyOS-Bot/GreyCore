const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

const libraryView =
    require(
        "../src/v2/views/library/LibraryView"
    );

test(
    "la bibliotheque conserve la page choisie avec ses boutons",
    () => {
        const characters = Array.from(
            {
                length: 26
            },
            (_, index) => ({
                id: `character-${index + 1}`,
                proxy_name: `Character ${index + 1}`,
                continuity_count: 1,
                installation_count: 1
            })
        );

        const firstPage = libraryView.build(
            characters,
            {
                page: 1
            }
        );
        const secondPage = libraryView.build(
            characters,
            {
                page: 2
            }
        );

        assert.equal(
            getButton(
                firstPage,
                "v2_library_next"
            ).custom_id,
            "v2_library_next:2"
        );
        assert.equal(
            getButton(
                secondPage,
                "v2_library_previous"
            ).custom_id,
            "v2_library_previous:1"
        );
        assert.equal(
            secondPage.components[0]
                .toJSON()
                .components[0]
                .options.length,
            1
        );
    }
);

test(
    "le routeur ouvre la page demandee et gere les anciens boutons",
    async () => {
        const pages = [];

        stubModule(
            "src/v2/interactions/buttons/openLibrary.js",
            async (
                interaction,
                page
            ) => {
                pages.push(page);
            }
        );

        const routerPath = require.resolve(
            "../src/v2/router/buttons/LibraryRouter"
        );

        delete require.cache[routerPath];

        const libraryRouter = require(
            "../src/v2/router/buttons/LibraryRouter"
        );

        assert.equal(
            await libraryRouter(
                createInteraction(
                    "v2_library_next:2"
                )
            ),
            true
        );

        assert.equal(
            await libraryRouter(
                createInteraction(
                    "v2_library_previous",
                    "Greycore V2 \u2022 Page 2/3"
                )
            ),
            true
        );

        assert.deepEqual(
            pages,
            [2, 1]
        );
    }
);

function getButton(view, customIdPrefix) {
    return view.components
        .flatMap(
            row => row.toJSON().components
        )
        .find(
            button => button.custom_id.startsWith(
                customIdPrefix
            )
        );
}

function createInteraction(
    customId,
    footerText = null
) {
    return {
        customId,
        isButton: () => true,
        message: footerText
            ? {
                embeds: [
                    {
                        footer: {
                            text: footerText
                        }
                    }
                ]
            }
            : null
    };
}
