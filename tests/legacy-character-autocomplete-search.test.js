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
    "la recherche legacy conserve includes Unicode et retourne au plus les 25 premiers résultats",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema:
                    true
            });

        context.after(
            () => isolated.cleanup()
        );

        seedCharacters(
            isolated.database
        );
        clearLegacyModules();

        const manager =
            require(
                "../src/managers/CharacterManager"
            );

        const first =
            manager.searchCharactersByGuild(
                "guild",
                "",
                25
            );

        assert.equal(
            first.length,
            25
        );
        assert.deepEqual(
            first.map(character => character.name),
            Array.from(
                {
                    length:
                        25
                },
                (_, index) =>
                    `Alpha ${String(index).padStart(3, "0")}`
            )
        );

        assert.deepEqual(
            manager
                .searchCharactersByGuild(
                    "guild",
                    "DLE 11",
                    25
                )
                .map(character => character.name),
            Array.from(
                {
                    length:
                        10
                },
                (_, index) =>
                    `Middle ${110 + index}`
            )
        );

        for (
            const [query, expected] of [
                ["élodie", "Élodie Finale"],
                ["àlex", "Àlex Final"],
                ["ömer", "Ömer Final"]
            ]
        ) {
            assert.deepEqual(
                manager
                    .searchCharactersByGuild(
                        "guild",
                        query,
                        25
                    )
                    .map(character => character.name),
                [
                    expected
                ]
            );
        }

        assert.deepEqual(
            manager.searchCharactersByGuild(
                "guild",
                "absent",
                25
            ),
            []
        );
        assert.equal(
            manager
                .searchCharactersByGuild(
                    "guild",
                    "Other Guild",
                    25
                ).length,
            0
        );
    }
);

test(
    "relation et rencontre partagent la recherche bornée et acceptent toujours l’ID legacy",
    async context => {
        const isolated =
            createIsolatedDatabase();

        context.after(
            () => isolated.cleanup()
        );

        clearLegacyModules();
        const characterManager =
            require(
                "../src/managers/CharacterManager"
            );
        const relationshipManager =
            require(
                "../src/managers/RelationshipManager"
            );
        const encounterManager =
            require(
                "../src/managers/EncounterManager"
            );
        const moduleManager =
            require(
                "../src/v2/managers/GuildModuleV2Manager"
            );

        const originalSearch =
            characterManager.searchCharactersByGuild;
        const originalGetAll =
            characterManager.getCharactersByGuild;
        const originalCreateRelationship =
            relationshipManager.createRelationship;
        const originalCreateEncounter =
            encounterManager.createEncounter;
        const originalIsEnabled =
            moduleManager.isEnabled;

        context.after(() => {
            characterManager.searchCharactersByGuild =
                originalSearch;
            characterManager.getCharactersByGuild =
                originalGetAll;
            relationshipManager.createRelationship =
                originalCreateRelationship;
            encounterManager.createEncounter =
                originalCreateEncounter;
            moduleManager.isEnabled =
                originalIsEnabled;
        });

        const searches = [];
        characterManager.searchCharactersByGuild =
            (...args) => {
                searches.push(args);
                return [{
                    id:
                        "legacy-id",
                    name:
                        "Legacy Name"
                }];
            };
        characterManager.getCharactersByGuild =
            () => {
                throw new Error(
                    "Le chargement global ne doit plus être utilisé."
                );
            };

        const relation =
            require(
                "../src/commands/relation"
            );
        const rencontre =
            require(
                "../src/commands/rencontre"
            );

        for (
            const command of [
                relation,
                rencontre
            ]
        ) {
            for (
                const optionName of [
                    "personnage_a",
                    "personnage_b"
                ]
            ) {
                let choices;
                await command.autocomplete({
                    guild: {
                        id:
                            "guild"
                    },
                    options: {
                        getFocused:
                            withName =>
                                withName
                                    ? {
                                        name:
                                            optionName,
                                        value:
                                            "gacy"
                                    }
                                    : "gacy"
                    },
                    respond:
                        async value => {
                            choices =
                                value;
                        }
                });

                assert.deepEqual(
                    choices,
                    [{
                        name:
                            "Legacy Name",
                        value:
                            "legacy-id"
                    }]
                );
            }
        }

        assert.deepEqual(
            searches,
            Array.from(
                {
                    length:
                        4
                },
                () => [
                    "guild",
                    "gacy",
                    25
                ]
            )
        );

        moduleManager.isEnabled =
            () => true;
        let relationshipInput;
        relationshipManager.createRelationship =
            input => {
                relationshipInput =
                    input;
                return {
                    label_a_to_b:
                        "ami",
                    label_b_to_a:
                        "ami"
                };
            };
        let encounterInput;
        encounterManager.createEncounter =
            input => {
                encounterInput =
                    input;
                return {
                    occurredAt:
                        "2026-08-28T00:00:00.000Z"
                };
            };

        await relation.execute(
            executeInteraction(
                {
                    personnage_a:
                        "legacy-id",
                    personnage_b:
                        "legacy-other",
                    type:
                        "1"
                }
            )
        );
        await rencontre.execute(
            executeInteraction(
                {
                    personnage_a:
                        "legacy-id",
                    personnage_b:
                        "legacy-other",
                    lieu:
                        null,
                    note:
                        null
                }
            )
        );

        assert.equal(
            relationshipInput.characterAId,
            "legacy-id"
        );
        assert.equal(
            encounterInput.characterAId,
            "legacy-id"
        );
    }
);

function executeInteraction(
    values
) {
    return {
        guildId:
            "guild",
        guild: {
            id:
                "guild"
        },
        user: {
            id:
                "owner"
        },
        options: {
            getString:
                name => values[name]
        },
        reply:
            async () => null
    };
}

function seedCharacters(
    database
) {
    const now =
        "2026-08-28T01:00:00.000Z";

    database.exec(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES
            ('guild', 'Greyline', '${now}'),
            ('other-guild', 'Other', '${now}');
    `);

    const insert =
        database.prepare(`
            INSERT INTO Characters (
                id, guild_id, owner_id, name, is_active,
                created_at, updated_at
            ) VALUES (?, ?, 'owner', ?, 1, ?, ?)
        `);

    for (let index = 0; index < 130; index += 1) {
        const prefix =
            index < 30
                ? "Alpha"
                : "Middle";
        insert.run(
            `character-${index}`,
            "guild",
            `${prefix} ${String(index).padStart(3, "0")}`,
            now,
            now
        );
    }

    for (
        const [id, name] of [
            ["accent-elodie", "Élodie Finale"],
            ["accent-alex", "Àlex Final"],
            ["accent-omer", "Ömer Final"]
        ]
    ) {
        insert.run(
            id,
            "guild",
            name,
            now,
            now
        );
    }

    insert.run(
        "other-character",
        "other-guild",
        "Other Guild Character",
        now,
        now
    );
}

function clearLegacyModules() {
    for (
        const modulePath of [
            "../src/managers/CharacterManager",
            "../src/autocomplete/characters",
            "../src/commands/relation",
            "../src/commands/rencontre"
        ]
    ) {
        delete require.cache[
            require.resolve(
                modulePath
            )
        ];
    }
}
