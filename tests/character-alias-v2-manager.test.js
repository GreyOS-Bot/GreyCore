const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "les alias V2 appartiennent au personnage et restent uniques pour leur proprietaire",
    () => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        try {
            const userManager =
                require(
                    "../src/v2/managers/UserV2Manager"
                );

            const characterManager =
                require(
                    "../src/v2/managers/CharacterV2Manager"
                );

            const aliasManager =
                require(
                    "../src/v2/managers/CharacterAliasV2Manager"
                );

            const owner =
                userManager.getOrCreate("owner");

            const alba =
                characterManager.create({
                    ownerUserId: owner.id,
                    proxyName: "Alba"
                });

            characterManager.create({
                ownerUserId: owner.id,
                proxyName: "Raya"
            });

            const created = aliasManager.add(
                alba.id,
                "  Al  "
            );

            assert.equal(created.alias, "Al");
            assert.deepEqual(
                aliasManager
                    .getForCharacter(alba.id)
                    .map(alias => alias.alias),
                ["Al"]
            );

            assert.throws(
                () =>
                    aliasManager.add(
                        alba.id,
                        "al"
                    ),
                /d\u00e9j\u00e0 utilis\u00e9/
            );

            assert.throws(
                () =>
                    aliasManager.add(
                        alba.id,
                        "Raya"
                    ),
                /proxy/
            );

            aliasManager.remove(
                alba.id,
                created.id
            );

            assert.deepEqual(
                aliasManager.getForCharacter(alba.id),
                []
            );
        } finally {
            isolated.cleanup();
        }
    }
);
