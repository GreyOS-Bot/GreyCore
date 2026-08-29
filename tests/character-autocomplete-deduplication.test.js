const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);
const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "les recherches V2 dédupliquent les personnages avant LIMIT 25 avec un représentant déterministe",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema:
                    true
            });

        context.after(
            () => isolated.cleanup()
        );

        const seed =
            createSeed(
                isolated.database
            );

        seed.character(
            "canonical",
            "Canonical Proxy"
        );
        seed.installation({
            id:
                10,
            characterId:
                "canonical",
            suffix:
                "zulu",
            alias:
                "Zulu"
        });
        seed.installation({
            id:
                11,
            characterId:
                "canonical",
            suffix:
                "alpha",
            alias:
                "Alpha"
        });

        seed.character(
            "filtered-first",
            "Filtered Proxy"
        );
        seed.installation({
            id:
                20,
            characterId:
                "filtered-first",
            suffix:
                "john",
            alias:
                "John"
        });
        seed.installation({
            id:
                21,
            characterId:
                "filtered-first",
            suffix:
                "alexander",
            alias:
                "Alexander"
        });

        seed.character(
            "tie",
            "Tie Proxy"
        );
        seed.installation({
            id:
                30,
            characterId:
                "tie",
            suffix:
                "older",
            continuityFirstname:
                "Older Label"
        });
        seed.installation({
            id:
                31,
            characterId:
                "tie",
            suffix:
                "newer",
            continuityFirstname:
                "Newer Label"
        });

        for (let index = 0; index < 30; index += 1) {
            const characterId =
                `match-${index}`;
            const number =
                String(index)
                    .padStart(2, "0");

            seed.character(
                characterId,
                `Match Proxy ${number}`
            );
            seed.installation({
                id:
                    100 + (index * 2),
                characterId,
                suffix:
                    "b",
                alias:
                    `Match ${number} B`
            });
            seed.installation({
                id:
                    101 + (index * 2),
                characterId,
                suffix:
                    "a",
                alias:
                    `Match ${number} A`
            });
        }

        clearRepositoryModules();
        const publicRepository =
            require(
                "../src/v2/repositories/CharacterPublicSearchRepository"
            );
        const correctionRepository =
            require(
                "../src/v2/repositories/CharacterTypeCorrectionRepository"
            );

        const publicCanonical =
            publicRepository
                .searchInstalledByDisplayName(
                    "guild",
                    ""
                )
                .find(
                    character =>
                        character.id === "canonical"
                );

        assert.equal(
            publicCanonical.display_name,
            "Alpha"
        );

        const correctionCanonical =
            correctionRepository
                .searchOnGuild(
                    "guild",
                    "canonical"
                );

        assert.equal(
            correctionCanonical.length,
            1
        );
        assert.equal(
            correctionCanonical[0].display_name,
            "Alpha"
        );

        const publicFiltered =
            publicRepository
                .searchInstalledByDisplayName(
                    "guild",
                    "alex"
                );

        assert.deepEqual(
            publicFiltered.map(
                character => character.id
            ),
            [
                "filtered-first"
            ]
        );
        assert.equal(
            publicFiltered[0].display_name,
            "Alexander"
        );

        const correctionFiltered =
            correctionRepository
                .searchOnGuild(
                    "guild",
                    "alex"
                );

        assert.deepEqual(
            correctionFiltered.map(
                character => character.id
            ),
            [
                "filtered-first"
            ]
        );
        assert.equal(
            correctionFiltered[0].display_name,
            "Alexander"
        );

        const tie =
            correctionRepository
                .searchOnGuild(
                    "guild",
                    "tie proxy"
                );

        assert.equal(
            tie.length,
            1
        );
        assert.equal(
            tie[0].display_name,
            "Tie Proxy"
        );
        assert.equal(
            tie[0].firstname,
            "Older Label"
        );

        const publicMatches =
            publicRepository
                .searchInstalledByDisplayName(
                    "guild",
                    "match"
                );
        const correctionMatches =
            correctionRepository
                .searchOnGuild(
                    "guild",
                    "match"
                );

        for (
            const results of [
                publicMatches,
                correctionMatches
            ]
        ) {
            assert.equal(
                results.length,
                25
            );
            assert.equal(
                new Set(
                    results.map(
                        character => character.id
                    )
                ).size,
                25
            );
        }
    }
);

test(
    "/personnages corriger et supprimer conservent label, propriétaire et ID sans fetch bloquant",
    async context => {
        const isolated =
            createIsolatedDatabase();

        context.after(
            () => isolated.cleanup()
        );

        stubModule(
            "src/v2/services/character/CharacterTypeCorrectionService.js",
            {
                search:
                    () => [{
                        id:
                            "character-id",
                        proxy_name:
                            "Proxy",
                        firstname:
                            "Canonical Name",
                        character_type:
                            "personnage_joue",
                        discord_user_id:
                            "owner"
                    }]
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/personnages"
            );
        delete require.cache[
            commandPath
        ];

        const command =
            require(
                "../src/commands/personnages"
            );

        for (
            const subcommand of [
                "corriger",
                "supprimer-personnage"
            ]
        ) {
            let choices;
            let memberFetchCount = 0;
            let userFetchCount = 0;
            const interaction = {
                guildId:
                    "guild",
                guild: {
                    members: {
                        cache:
                            new Map([
                                [
                                    "owner",
                                    {
                                        displayName:
                                            "Owner Display"
                                    }
                                ]
                            ]),
                        fetch:
                            async () => {
                                memberFetchCount += 1;
                            }
                    }
                },
                client: {
                    users: {
                        cache:
                            new Map(),
                        fetch:
                            async () => {
                                userFetchCount += 1;
                            }
                    }
                },
                options: {
                    getSubcommand:
                        () => subcommand,
                    getFocused:
                        () => ({
                            name:
                                "personnage",
                            value:
                                "canonical"
                        })
                },
                respond:
                    async value => {
                        choices =
                            value;
                    }
            };

            await command.autocomplete(
                interaction
            );

            assert.deepEqual(
                choices,
                [{
                    name:
                        "Canonical Name — PJ — Owner Display",
                    value:
                        "character-id"
                }]
            );
            assert.equal(
                memberFetchCount,
                0
            );
            assert.equal(
                userFetchCount,
                0
            );
        }
    }
);

function createSeed(
    database
) {
    const now =
        "2026-08-28T00:00:00.000Z";

    database.exec(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild', 'Greyline', '${now}');

        INSERT INTO UsersV2 (id, discord_user_id, created_at, updated_at)
        VALUES (1, 'owner', '${now}', '${now}');
    `);

    const insertCharacter =
        database.prepare(`
            INSERT INTO CharactersV2 (
                id, owner_user_id, proxy_name, character_type,
                is_archived, created_at, updated_at
            ) VALUES (?, 1, ?, 'personnage_joue', 0, ?, ?)
        `);
    const insertContinuity =
        database.prepare(`
            INSERT INTO CharacterContinuitiesV2 (
                id, character_id, name, firstname, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
    const insertProfile =
        database.prepare(`
            INSERT INTO CharacterProfilesV2 (
                continuity_id, alias, created_at, updated_at
            ) VALUES (?, ?, ?, ?)
        `);
    const insertInstallation =
        database.prepare(`
            INSERT INTO CharacterGuildInstallationsV2 (
                id, character_id, continuity_id, guild_id, status,
                visibility, proxy_enabled, installed_at, updated_at
            ) VALUES (?, ?, ?, 'guild', 'approved', 'private', 1, ?, ?)
        `);

    return {
        character(
            id,
            proxyName
        ) {
            insertCharacter.run(
                id,
                proxyName,
                now,
                now
            );
        },
        installation({
            id,
            characterId,
            suffix,
            alias = null,
            continuityFirstname = null
        }) {
            const continuityId =
                `continuity-${characterId}-${suffix}`;
            insertContinuity.run(
                continuityId,
                characterId,
                `Story ${suffix}`,
                continuityFirstname,
                now,
                now
            );
            if (alias !== null) {
                insertProfile.run(
                    continuityId,
                    alias,
                    now,
                    now
                );
            }
            insertInstallation.run(
                id,
                characterId,
                continuityId,
                now,
                now
            );
        }
    };
}

function clearRepositoryModules() {
    for (
        const modulePath of [
            "../src/v2/repositories/CharacterPublicSearchRepository",
            "../src/v2/repositories/CharacterTypeCorrectionRepository"
        ]
    ) {
        delete require.cache[
            require.resolve(
                modulePath
            )
        ];
    }
}
