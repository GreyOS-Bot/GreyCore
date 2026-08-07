const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const libraryHomeView =
    require(
        "../src/v2/views/home/LibraryHomeView"
    );

const libraryView =
    require(
        "../src/v2/views/library/LibraryView"
    );

function getButtons(view) {
    return view.components.flatMap(row =>
        row.toJSON().components
    );
}

test(
    "l'accueil et la bibliothèque ne proposent que leurs actions disponibles",
    () => {
        const home =
            libraryHomeView.build(
                { username: "Fiona" },
                {
                    characters: 1,
                    continuities: 1,
                    installations: 1,
                    archived: 0
                },
                [
                    {
                        id: "character",
                        proxy_name: "Alba",
                        continuity_count: 1,
                        installation_count: 1
                    }
                ]
            );

        const homeEmbed =
            home.embeds[0].toJSON();

        const homeButtons =
            getButtons(home);

        assert.equal(
            homeButtons.some(button =>
                button.custom_id ===
                "v2_player_directory"
            ),
            true
        );

        assert.match(
            homeEmbed.title,
            /Accueil/
        );

        assert.equal(
            homeButtons.some(button =>
                button.custom_id ===
                "v2_notifications"
            ),
            false
        );

        assert.equal(
            homeButtons.some(button =>
                button.custom_id ===
                "v2_user_settings"
            ),
            false
        );

        assert.equal(
            home.components[0]
                .toJSON()
                .components[0]
                .custom_id,
            "v2_library_character_select"
        );

        const library =
            libraryView.build([]);

        const libraryButtons =
            getButtons(library);

        assert.equal(
            libraryButtons.some(button =>
                button.custom_id ===
                "v2_library_archives"
            ),
            false
        );

        assert.equal(
            libraryButtons.find(button =>
                button.custom_id ===
                "v2_library_home"
            ).label,
            "Vue d’ensemble"
        );
    }
);
