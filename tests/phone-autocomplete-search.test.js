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
    "/phone recherche en une requête dédiée les personnages jouables et bornés",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema:
                    true
            });

        context.after(
            () => isolated.cleanup()
        );

        seedDatabase(
            isolated.database
        );

        const repositoryPath =
            require.resolve(
                "../src/v2/repositories/CharacterRepository"
            );
        delete require.cache[
            repositoryPath
        ];

        const repository =
            require(
                "../src/v2/repositories/CharacterRepository"
            );

        const all =
            repository
                .searchOwnedPlayableCharacters({
                    discordUserId:
                        "owner",
                    guildId:
                        "guild-main",
                    query:
                        "",
                    limit:
                        25
                });

        assert.equal(
            all.length,
            25
        );
        assert.deepEqual(
            all.slice(0, 3).map(
                character => character.proxy_name
            ),
            [
                "Alpha 00",
                "Alpha 01",
                "Alpha 02"
            ]
        );
        assert.equal(
            new Set(
                all.map(character => character.id)
            ).size,
            all.length
        );

        const substring =
            repository
                .searchOwnedPlayableCharacters({
                    discordUserId:
                        "owner",
                    guildId:
                        "guild-main",
                    query:
                        "PHA 0",
                    limit:
                        25
                });

        assert.equal(
            substring.length,
            10
        );
        assert.deepEqual(
            repository
                .searchOwnedPlayableCharacters({
                    discordUserId:
                        "missing-user",
                    guildId:
                        "guild-main",
                    query:
                        "",
                    limit:
                        25
                }),
            []
        );
        assert.deepEqual(
            repository
                .searchOwnedPlayableCharacters({
                    discordUserId:
                        "owner",
                    guildId:
                        "guild-main",
                    query:
                        "personnage absent",
                    limit:
                        25
                }),
            []
        );

        for (
            const excluded of [
                "Archived",
                "Other guild",
                "Pending",
                "Proxy off",
                "Other owner"
            ]
        ) {
            assert.equal(
                repository
                    .searchOwnedPlayableCharacters({
                        discordUserId:
                            "owner",
                        guildId:
                            "guild-main",
                        query:
                            excluded,
                        limit:
                            25
                    }).length,
                0
            );
        }
    }
);

test(
    "/phone conserve le nom visible, l’ID choisi et le contrat de sélection final",
    async context => {
        const isolated =
            createIsolatedDatabase();

        context.after(
            () => isolated.cleanup()
        );

        for (
            const modulePath of [
                "../src/v2/repositories/CharacterRepository",
                "../src/v2/managers/CharacterV2Manager",
                "../src/commands/phone"
            ]
        ) {
            delete require.cache[
                require.resolve(
                    modulePath
                )
            ];
        }

        const manager =
            require(
                "../src/v2/managers/CharacterV2Manager"
            );
        const moduleManager =
            require(
                "../src/v2/managers/GuildModuleV2Manager"
            );
        const phonePage =
            require(
                "../src/v2/pages/character/CharacterPhonePage"
            );
        const command =
            require(
                "../src/commands/phone"
            );

        const originalSearch =
            manager.searchOwnedPlayableCharacters;
        const originalEnabled =
            moduleManager.isEnabled;
        const originalGetOwned =
            command.getOwnedCharacters;
        const originalExecute =
            phonePage.execute;

        context.after(() => {
            manager.searchOwnedPlayableCharacters =
                originalSearch;
            moduleManager.isEnabled =
                originalEnabled;
            command.getOwnedCharacters =
                originalGetOwned;
            phonePage.execute =
                originalExecute;
        });

        let searchOptions;
        let choices;
        manager.searchOwnedPlayableCharacters =
            options => {
                searchOptions =
                    options;
                return [{
                    id:
                        "character-id",
                    proxy_name:
                        "Éclipse"
                }];
            };
        moduleManager.isEnabled =
            () => true;

        await command.autocomplete({
            guildId:
                "guild-main",
            user: {
                id:
                    "owner"
            },
            options: {
                getFocused:
                    () => "  ÉCL  "
            },
            respond:
                value => {
                    choices =
                        value;
                }
        });

        assert.deepEqual(
            searchOptions,
            {
                discordUserId:
                    "owner",
                guildId:
                    "guild-main",
                query:
                    "écl",
                limit:
                    25
            }
        );
        assert.deepEqual(
            choices,
            [{
                name:
                    "Éclipse",
                value:
                    "character-id"
            }]
        );

        command.getOwnedCharacters =
            () => [{
                id:
                    "character-id",
                proxy_name:
                    "Éclipse"
            }];
        let openedCharacterId;
        phonePage.execute =
            async (
                interaction,
                characterId
            ) => {
                openedCharacterId =
                    characterId;
            };

        await command.execute({
            guildId:
                "guild-main",
            user: {
                id:
                    "owner"
            },
            options: {
                getString:
                    () => "character-id"
            }
        });

        assert.equal(
            openedCharacterId,
            "character-id"
        );
    }
);

function seedDatabase(
    database
) {
    const now =
        "2026-08-27T20:00:00.000Z";

    database.exec(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES
            ('guild-main', 'Principal', '${now}'),
            ('guild-other', 'Autre', '${now}');

        INSERT INTO UsersV2 (id, discord_user_id, created_at, updated_at)
        VALUES
            (1, 'owner', '${now}', '${now}'),
            (2, 'other-owner', '${now}', '${now}');
    `);

    const insertCharacter =
        database.prepare(`
            INSERT INTO CharactersV2 (
                id, owner_user_id, proxy_name, character_type,
                is_archived, created_at, updated_at
            ) VALUES (?, ?, ?, 'personnage_joue', ?, ?, ?)
        `);
    const insertContinuity =
        database.prepare(`
            INSERT INTO CharacterContinuitiesV2 (
                id, character_id, name, is_archived, created_at, updated_at
            ) VALUES (?, ?, 'Principale', 0, ?, ?)
        `);
    const insertInstallation =
        database.prepare(`
            INSERT INTO CharacterGuildInstallationsV2 (
                character_id, continuity_id, guild_id, status,
                visibility, proxy_enabled, installed_at, updated_at
            ) VALUES (?, ?, ?, ?, 'private', ?, ?, ?)
        `);

    const add = ({
        id,
        name,
        owner = 1,
        archived = 0,
        guild = "guild-main",
        status = "approved",
        proxyEnabled = 1,
        suffix = ""
    }) => {
        const continuityId =
            `continuity-${id}${suffix}`;
        try {
            insertCharacter.run(
                id,
                owner,
                name,
                archived,
                now,
                now
            );
            insertContinuity.run(
                continuityId,
                id,
                now,
                now
            );
            insertInstallation.run(
                id,
                continuityId,
                guild,
                status,
                proxyEnabled,
                now,
                now
            );
        } catch (error) {
            throw new Error(
                `Fixture invalide pour ${id}`,
                {
                    cause:
                        error
                }
            );
        }
    };

    for (let index = 0; index < 30; index += 1) {
        add({
            id:
                `alpha-${index}`,
            name:
                `Alpha ${String(index).padStart(2, "0")}`
        });
    }

    const duplicateContinuity =
        "continuity-alpha-00-duplicate";
    try {
        database.prepare(`
            INSERT INTO CharacterContinuitiesV2 (
                id, character_id, name, is_archived, created_at, updated_at
            ) VALUES (?, ?, 'Alternative', 0, ?, ?)
        `).run(
            duplicateContinuity,
            "alpha-0",
            now,
            now
        );
    } catch (error) {
        throw new Error(
            "Fixture invalide pour la continuité dupliquée",
            {
                cause:
                    error
            }
        );
    }

    try {
        insertInstallation.run(
            "alpha-0",
            duplicateContinuity,
            "guild-main",
            "approved",
            1,
            now,
            now
        );
    } catch (error) {
        throw new Error(
            "Fixture invalide pour l’installation dupliquée",
            {
                cause:
                    error
            }
        );
    }

    add({ id: "archived", name: "Archived", archived: 1 });
    add({ id: "other-guild", name: "Other guild", guild: "guild-other" });
    add({ id: "pending", name: "Pending", status: "pending" });
    add({ id: "proxy-off", name: "Proxy off", proxyEnabled: 0 });
    add({ id: "other-owner", name: "Other owner", owner: 2 });
}
