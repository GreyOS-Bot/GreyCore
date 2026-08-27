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
    "la recherche propriétaire précède LIMIT 25 sans modifier la recherche globale",
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

        for (let index = 0; index < 30; index += 1) {
            seed.character({
                id:
                    `other-alex-${index}`,
                ownerId:
                    2,
                proxyName:
                    `Alex A${String(index).padStart(2, "0")}`
            });
        }
        seed.character({
            id:
                "owned-alex",
            ownerId:
                1,
            proxyName:
                "Alex Z Personnel"
        });

        clearCorrectionModules();
        const service =
            require(
                "../src/v2/services/character/CharacterTypeCorrectionService"
            );

        const globalAlex =
            service.search(
                "guild",
                "AlEx"
            );

        assert.equal(
            globalAlex.length,
            25
        );
        assert.equal(
            globalAlex.some(
                character => character.id === "owned-alex"
            ),
            false
        );
        assert.equal(
            new Set(
                globalAlex.map(
                    character => character.discord_user_id
                )
            ).has("other-owner"),
            true
        );

        const ownedAlex =
            service.search(
                "guild",
                "  alex  ",
                {
                    ownerDiscordUserId:
                        "owner"
                }
            );

        assert.deepEqual(
            ownedAlex.map(
                character => character.id
            ),
            [
                "owned-alex"
            ]
        );
        assert.equal(
            ownedAlex.every(
                character =>
                    character.discord_user_id === "owner"
            ),
            true
        );

        for (let index = 0; index < 30; index += 1) {
            seed.character({
                id:
                    `owned-many-${index}`,
                ownerId:
                    1,
                proxyName:
                    `Bounded ${String(index).padStart(2, "0")}`
            });
        }

        assert.equal(
            service.search(
                "guild",
                "bounded",
                {
                    ownerDiscordUserId:
                        "owner"
                }
            ).length,
            25
        );
        assert.deepEqual(
            service.search(
                "guild",
                "bounded",
                {
                    ownerDiscordUserId:
                        "missing-owner"
                }
            ),
            []
        );

        seed.character({
            id:
                "alias-match",
            ownerId:
                1,
            proxyName:
                "Proxy Alias",
            alias:
                "Needle Alias"
        });
        seed.character({
            id:
                "firstname-match",
            ownerId:
                1,
            proxyName:
                "Proxy Firstname",
            firstname:
                "Needle Firstname"
        });
        seed.character({
            id:
                "lastname-match",
            ownerId:
                1,
            proxyName:
                "Proxy Lastname",
            lastname:
                "Needle Lastname"
        });
        seed.character({
            id:
                "other-needle",
            ownerId:
                2,
            proxyName:
                "Needle Other"
        });
        seed.character({
            id:
                "archived-installation",
            ownerId:
                1,
            proxyName:
                "Needle Archived",
            status:
                "archived"
        });

        const ownedNeedle =
            service.search(
                "guild",
                "needle",
                {
                    ownerDiscordUserId:
                        "owner"
                }
            );

        assert.deepEqual(
            new Set(
                ownedNeedle.map(
                    character => character.id
                )
            ),
            new Set([
                "alias-match",
                "firstname-match",
                "lastname-match"
            ])
        );
        assert.equal(
            service.search(
                "guild",
                "needle"
            ).some(
                character =>
                    character.id === "other-needle"
            ),
            true
        );
    }
);

test(
    "/personnage type transmet le propriétaire seulement pour un joueur non staff",
    async context => {
        const isolated =
            createIsolatedDatabase();

        context.after(
            () => isolated.cleanup()
        );

        clearCorrectionModules();
        const service =
            require(
                "../src/v2/services/character/CharacterTypeCorrectionService"
            );
        const staffPolicy =
            require(
                "../src/v2/core/policies/StaffPermissionPolicy"
            );
        const displayService =
            require(
                "../src/v2/core/services/DiscordUserDisplayService"
            );
        const command =
            require(
                "../src/commands/personnage"
            );

        const originalSearch =
            service.search;
        const originalCanManage =
            staffPolicy.canManageCharacters;
        const originalResolveMany =
            displayService.resolveMany;

        context.after(() => {
            service.search =
                originalSearch;
            staffPolicy.canManageCharacters =
                originalCanManage;
            displayService.resolveMany =
                originalResolveMany;
        });

        const calls = [];
        service.search =
            (...args) => {
                calls.push(args);
                return [];
            };
        displayService.resolveMany =
            async () => new Map();

        const interaction = {
            guildId:
                "guild",
            user: {
                id:
                    "owner"
            },
            options: {
                getSubcommand:
                    () => "type",
                getFocused:
                    () => " alex "
            },
            respond:
                async () => null
        };

        staffPolicy.canManageCharacters =
            () => false;
        await command.autocomplete(
            interaction
        );

        staffPolicy.canManageCharacters =
            () => true;
        await command.autocomplete(
            interaction
        );

        assert.deepEqual(
            calls,
            [
                [
                    "guild",
                    "alex",
                    {
                        ownerDiscordUserId:
                            "owner"
                    }
                ],
                [
                    "guild",
                    "alex",
                    {
                        ownerDiscordUserId:
                            null
                    }
                ]
            ]
        );
    }
);

function createSeed(
    database
) {
    const now =
        "2026-08-27T21:30:00.000Z";

    database.exec(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild', 'Greyline', '${now}');

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
            ) VALUES (?, ?, ?, 'personnage_joue', 0, ?, ?)
        `);
    const insertContinuity =
        database.prepare(`
            INSERT INTO CharacterContinuitiesV2 (
                id, character_id, name, firstname, created_at, updated_at
            ) VALUES (?, ?, 'Principale', ?, ?, ?)
        `);
    const insertProfile =
        database.prepare(`
            INSERT INTO CharacterProfilesV2 (
                continuity_id, alias, firstname, lastname,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
    const insertInstallation =
        database.prepare(`
            INSERT INTO CharacterGuildInstallationsV2 (
                character_id, continuity_id, guild_id, status,
                visibility, proxy_enabled, installed_at, updated_at
            ) VALUES (?, ?, 'guild', ?, 'private', 1, ?, ?)
        `);

    return {
        character({
            id,
            ownerId,
            proxyName,
            alias = null,
            firstname = null,
            lastname = null,
            status = "approved"
        }) {
            const continuityId =
                `continuity-${id}`;
            insertCharacter.run(
                id,
                ownerId,
                proxyName,
                now,
                now
            );
            insertContinuity.run(
                continuityId,
                id,
                firstname,
                now,
                now
            );
            insertProfile.run(
                continuityId,
                alias,
                firstname,
                lastname,
                now,
                now
            );
            insertInstallation.run(
                id,
                continuityId,
                status,
                now,
                now
            );
        }
    };
}

function clearCorrectionModules() {
    for (
        const modulePath of [
            "../src/v2/repositories/CharacterTypeCorrectionRepository",
            "../src/v2/services/character/CharacterTypeCorrectionService",
            "../src/commands/personnage"
        ]
    ) {
        delete require.cache[
            require.resolve(
                modulePath
            )
        ];
    }
}
