const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "la recherche publique par alias compile sur le vrai schéma SQLite",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        context.after(
            () => isolated.cleanup()
        );

        const repositoryPath =
            require.resolve(
                "../src/v2/repositories/CharacterPublicSearchRepository"
            );
        delete require.cache[repositoryPath];

        const repository = require(
            "../src/v2/repositories/CharacterPublicSearchRepository"
        );

        assert.deepEqual(
            repository
                .searchInstalledByDisplayName(
                    "guild",
                    "Freyja"
                ),
            []
        );
    }
);
