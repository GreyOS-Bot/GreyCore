const test = require("node:test");
const assert = require("node:assert/strict");

const view = require(
    "../src/v2/views/installation/InstallationDetailView"
);

test(
    "une installation suspendue donne accès au formulaire de correction",
    () => {
        const payload = view.build({
            character: {
                id: "character",
                proxy_name: "Freyja",
                avatar_url: null
            },
            continuity: {
                id: "continuity",
                name: "Principale"
            },
            installation: {
                id: 42,
                status: "suspended",
                local_avatar_url: null,
                rejection_reason:
                    "Corriger le prénom affiché."
            },
            guildName: "Greyline"
        });

        const buttonIds = payload.components
            .flatMap(row =>
                row.components
            )
            .map(component =>
                component.data.custom_id
            );

        assert.ok(
            buttonIds.includes(
                "v2_rejection_edit:42"
            )
        );
    }
);
