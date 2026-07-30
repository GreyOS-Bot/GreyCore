const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "les relations par d\u00e9faut utilisent Friends with benefits et mettent \u00e0 jour l'ancien libell\u00e9",
    () => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        try {
            isolated.database.prepare(`
                INSERT INTO Guilds (
                    id,
                    name,
                    created_at
                )
                VALUES (?, ?, ?)
            `).run(
                "guild-default-types",
                "Guild defaults",
                new Date().toISOString()
            );

            const manager =
                loadRelationshipManager();

            manager.installDefaultRelationshipTypes(
                "guild-default-types"
            );

            isolated.database.prepare(`
                UPDATE RelationshipTypes
                SET
                    label_a_to_b = 'Sexfriend de',
                    label_b_to_a = 'Sexfriend de'
                WHERE guild_id = ?
                AND key = 'sexfriend'
            `).run(
                "guild-default-types"
            );

            const types =
                manager.installDefaultRelationshipTypes(
                    "guild-default-types"
                );

            const friendsWithBenefits =
                types.find(
                    type =>
                        type.key === "sexfriend"
                );

            assert.equal(
                friendsWithBenefits.label_a_to_b,
                "Friends with benefits de"
            );
            assert.equal(
                friendsWithBenefits.label_b_to_a,
                "Friends with benefits de"
            );

            for (
                const key
                of [
                    "parent",
                    "uncle_aunt",
                    "unacknowledged_couple"
                ]
            ) {
                assert.ok(
                    types.some(
                        type => type.key === key
                    ),
                    key
                );
            }
        } finally {
            isolated.cleanup();
        }
    }
);

function loadRelationshipManager() {
    const modulePath =
        require.resolve(
            "../src/managers/RelationshipManager"
        );

    delete require.cache[modulePath];

    return require(
        "../src/managers/RelationshipManager"
    );
}
