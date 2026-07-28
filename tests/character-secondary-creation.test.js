const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const characterTypes =
    require(
        "../src/v2/core/character/CharacterTypeCatalog"
    );

const characterCreateModal =
    require(
        "../src/v2/modals/CharacterCreateModal"
    );

const characterCreationService =
    require(
        "../src/v2/services/character/CharacterCreationV2Service"
    );

function labels(modal) {
    return modal.toJSON().components.map(row =>
        row.components[0].label
    );
}

test(
    "les personnages secondaires ont une cr\u00e9ation simplifi\u00e9e et des r\u00e8gles explicites",
    () => {
        assert.equal(
            characterTypes.usesSimpleCreation(
                "personnage_joue"
            ),
            false
        );

        assert.equal(
            characterTypes.usesSimpleCreation("pnj"),
            false
        );

        for (
            const type of [
                "random",
                "pnj_reserve",
                "reserve_staff"
            ]
        ) {
            assert.equal(
                characterTypes.usesSimpleCreation(type),
                true,
                type
            );

            assert.deepEqual(
                labels(
                    characterCreateModal.build(type)
                ),
                [
                    "Proxy \u00e0 taper (ex. Ino)",
                    "Pr\u00e9nom affich\u00e9 (nom facultatif)"
                ],
                type
            );
        }

        assert.equal(
            characterTypes.getUsageScope("random"),
            "shared"
        );

        assert.equal(
            characterTypes.getUsageScope("pnj_reserve"),
            "staff"
        );

        assert.deepEqual(
            labels(
                characterCreateModal.build(
                    "personnage_joue"
                )
            ),
            [
                "Proxy \u00e0 taper (ex. Ino)",
                "Pr\u00e9nom ou alias affich\u00e9",
                "Vrai pr\u00e9nom (facultatif)",
                "Nom (facultatif)",
                "\u00c2ge (facultatif)"
            ]
        );

        const playerDetails =
            characterCreateModal
                .buildDetails(
                    "personnage_joue"
                )
                .toJSON()
                .components
                .map(row => row.components[0]);

        assert.deepEqual(
            playerDetails.map(
                input => input.label
            ),
            [
                "Organisation ou gang (\u00e9cris Sans si aucun)",
                "M\u00e9tier (facultatif)",
                "Date anniversaire (facultatif)",
                "Date de cr\u00e9ation (facultatif)",
                "Histoire"
            ]
        );

        assert.equal(
            playerDetails[4].required,
            true
        );

        const random =
            characterCreationService.normalize({
                discordUserId: "user",
                guildId: "guild",
                guildName: "Serveur",
                type: "random",
                proxyName: "Gars 1",
                fullName: "Gars 1"
            });

        assert.equal(random.firstname, "Gars 1");
        assert.equal(random.lastname, null);
        assert.equal(random.age, null);

        const pnj =
            characterCreationService.normalize({
                discordUserId: "user",
                guildId: "guild",
                guildName: "Serveur",
                type: "pnj",
                proxyName: "Parent",
                fullName: "Parent Test",
                gang: "sans",
                birthday: "27 juillet 2026",
                occupation: "M\u00e9decin",
                creationDate: "1er ao\u00fbt 2026",
                alias: "Le Parent"
            });

        assert.equal(pnj.age, null);
        assert.equal(pnj.gang, "Sans");
        assert.equal(pnj.birthday, "27 juillet 2026");
        assert.equal(pnj.occupation, "M\u00e9decin");
        assert.equal(pnj.creationDate, "1er ao\u00fbt 2026");
        assert.equal(pnj.alias, "Le Parent");

        const namedPnj =
            characterCreationService.normalize({
                discordUserId: "user",
                guildId: "guild",
                guildName: "Serveur",
                type: "pnj",
                proxyName: "Le Gardien",
                firstname: "\u00c9mile",
                lastname: "Du Pont"
            });

        assert.equal(namedPnj.firstname, "\u00c9mile");
        assert.equal(namedPnj.lastname, "Du Pont");

        assert.throws(
            () =>
                characterCreationService.normalize({
                    discordUserId: "user",
                    guildId: "guild",
                    guildName: "Serveur",
                    type: "personnage_joue",
                    proxyName: "Alba",
                    fullName: "Alba Test"
                }),
            /histoire est obligatoire/
        );
    }
);
