const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const relationshipModals =
    require(
        "../src/v2/interactions/relationships/RelationshipModalFactory"
    );

const outfitModals =
    require(
        "../src/v2/interactions/outfits/OutfitModalFactory"
    );

const encounterModals =
    require(
        "../src/v2/interactions/encounters/EncounterModalFactory"
    );

const profileModals =
    require(
        "../src/v2/interactions/profile/ProfileEditModalFactory"
    );

const rejectedProfileView =
    require(
        "../src/v2/views/validation/RejectedProfileView"
    );

const characterCreateModal =
    require(
        "../src/v2/modals/CharacterCreateModal"
    );

function labels(modal) {
    return modal.toJSON().components.map(row =>
        row.components[0].label
    );
}

function assertOptionalLabels(modal) {
    for (const label of labels(modal)) {
        assert.match(label, /\(facultatif\)$/);
    }
}

test(
    "les champs facultatifs sont signal\u00e9s dans les formulaires",
    () => {
        assertOptionalLabels(
            relationshipModals.createRelationshipModal({
                contextId: "relation-context"
            })
        );

        assertOptionalLabels(
            outfitModals.createEditModal({
                id: "outfit"
            })
        );

        assertOptionalLabels(
            encounterModals.createInternal(
                "continuity-a",
                "continuity-b"
            )
        );

        assertOptionalLabels(
            profileModals.createIdentityModal(
                "character"
            )
        );

        assertOptionalLabels(
            profileModals.createStoryModal(
                "character"
            )
        );

        assertOptionalLabels(
            rejectedProfileView.modal({
                installation: { id: "installation" },
                character: { proxy_name: "Alba" },
                profile: {}
            })
        );

        const creationInputs =
            characterCreateModal
                .build("pnj")
                .toJSON()
                .components
            .map(row => row.components[0]);

        assert.deepEqual(
            creationInputs
                .filter(input => !input.required)
                .map(input => input.custom_id),
            [
                "profile_firstname",
                "profile_lastname",
                "profile_age"
            ]
        );

        for (
            const input of creationInputs.filter(
                input => !input.required
            )
        ) {
            assert.match(
                input.label,
                /\(facultatif\)$/
            );
        }

        const detailInputs =
            characterCreateModal
                .buildDetails("pnj")
                .toJSON()
                .components
                .map(row => row.components[0]);

        assert.deepEqual(
            detailInputs
                .filter(input => !input.required)
                .map(input => input.custom_id),
            [
                "profile_occupation",
                "profile_birthday",
                "profile_creation_date",
                "profile_story"
            ]
        );
    }
);
