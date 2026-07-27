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
    "les champs facultatifs sont signalés dans les formulaires",
    () => {
        assertOptionalLabels(
            relationshipModals.createRelationshipModal({
                continuityAId: "a",
                continuityBId: "b",
                relationshipTypeId: "type"
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

        assert.match(
            labels(
                characterCreateModal.build(
                    "pnj"
                )
            ).find(label =>
                label.startsWith(
                    "Gang ou organisation"
                )
            ),
            /\(facultatif\)$/
        );
    }
);
