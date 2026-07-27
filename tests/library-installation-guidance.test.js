const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const libraryView =
    require(
        "../src/v2/views/library/LibraryView"
    );

test(
    "la bibliothèque explique comment installer un personnage sur le serveur courant",
    () => {
        const view =
            libraryView.build([
                {
                    id: "character",
                    proxy_name: "Alba",
                    continuity_count: 1,
                    installation_count: 1
                }
            ]);

        const description =
            view.embeds[0]
                .toJSON()
                .description;

        assert.match(
            description,
            /Installer sur ce serveur/
        );

        assert.match(
            description,
            /Configuration/
        );
    }
);
