const test = require("node:test");
const assert = require("node:assert/strict");

test(
    "la vue de brouillon masque la continuite et conserve le bouton de validation",
    () => {
        const view = require(
            "../src/v2/views/deployment/InstallationCreatedView"
        );

        const payload = view.build(
            {
                id: "character",
                proxy_name: "Reya",
                avatar_url: "https://avatar.test/image.png"
            },
            {
                id: "continuity",
                name: "Greyline",
                mode: "original"
            },
            {
                id: 7,
                status: "draft",
                local_avatar_url: null
            },
            {
                id: "guild",
                name: "Greyline"
            },
            { created: false }
        );

        const ids = payload.components
            .flatMap(row =>
                row.toJSON().components
            )
            .map(component =>
                component.custom_id
            );

        assert.ok(
            ids.includes("v2_install_submit:7")
        );
        assert.equal(
            ids.includes(
                "v2_story_home:continuity"
            ),
            false
        );
    }
);
