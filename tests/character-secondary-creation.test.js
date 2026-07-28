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
    "les personnages secondaires ont une création simplifiée et des règles explicites",
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
                    "Nom du proxy",
                    "Prénom"
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
                fullName: "Parent Test"
            });

        assert.equal(pnj.age, null);
    }
);
