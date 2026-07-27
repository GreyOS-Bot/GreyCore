const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const groupDraftService =
    require(
        "../src/v2/services/phone/PhoneGroupDraftService"
    );

test(
    "un brouillon de groupe garde ses membres et son nom pour son créateur",
    () => {
        const userId =
            "user-group-test";

        const characterId =
            "character-group-test";

        groupDraftService.clear(
            userId,
            characterId
        );

        groupDraftService.start({
            userId,
            characterId,
            ownerPhoneId: 10
        });

        groupDraftService.addMember({
            userId,
            characterId,
            ownerPhoneId: 10,
            phoneId: 20
        });

        groupDraftService.addMember({
            userId,
            characterId,
            ownerPhoneId: 10,
            phoneId: 30
        });

        groupDraftService.setName({
            userId,
            characterId,
            ownerPhoneId: 10,
            name: "  La bande  "
        });

        const draft =
            groupDraftService.get(
                userId,
                characterId
            );

        assert.deepEqual(
            draft.phoneIds,
            [
                20,
                30
            ]
        );

        assert.equal(
            draft.name,
            "La bande"
        );

        groupDraftService.removeMember({
            userId,
            characterId,
            phoneId: 20
        });

        assert.deepEqual(
            groupDraftService.get(
                userId,
                characterId
            ).phoneIds,
            [30]
        );

        groupDraftService.clear(
            userId,
            characterId
        );
    }
);

test(
    "un brouillon de groupe ne permet pas d’ajouter son propre téléphone",
    () => {
        const userId =
            "user-group-owner-test";

        const characterId =
            "character-group-owner-test";

        groupDraftService.start({
            userId,
            characterId,
            ownerPhoneId: 10
        });

        assert.throws(
            () =>
                groupDraftService.addMember({
                    userId,
                    characterId,
                    ownerPhoneId: 10,
                    phoneId: 10
                }),
            /vous-même/
        );

        groupDraftService.clear(
            userId,
            characterId
        );
    }
);
