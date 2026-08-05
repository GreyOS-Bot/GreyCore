const fs =
    require("node:fs");
const path =
    require("node:path");
const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase,
    withMutedConsole
} = require(
    "./helpers/isolatedDatabase"
);

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "la création complète reste atomique après la séparation",
    async () => {
        const isolated =
            createIsolatedDatabase();

        try {
            isolated.database
                .pragma(
                    "foreign_keys = ON"
                );

            const schema =
                require(
                    "../src/database/schema"
                );

            await withMutedConsole(
                () =>
                    schema
                        .initializeDatabase()
            );

            clearModule(
                "../src/v2/repositories/OperationUnitOfWork"
            );
            clearModule(
                "../src/v2/repositories/GuildRepository"
            );
            clearModule(
                "../src/v2/services/character/CharacterCreationV2Service"
            );

            const service =
                require(
                    "../src/v2/services/character/CharacterCreationV2Service"
                );

            const result =
                service.create({
                    discordUserId:
                        "discord-a",
                    guildId:
                        "guild-a",
                    guildName:
                        "Serveur A",
                    type:
                        "personnage_joue",
                    proxyName:
                        "Alba Proxy",
                    fullName:
                        "Alba Grey",
                    age:
                        "23",
                    gang:
                        "La Mano de Dios",
                    birthday:
                        "27 juillet 2026",
                    occupation:
                        "Avocate",
                    creationDate:
                        "1er ao\u00fbt 2026",
                    alias:
                        "Avocate Alba",
                    story:
                        "Une histoire"
                });

            assert.equal(
                result.character
                    .proxy_name,
                "Alba Proxy"
            );
            assert.equal(
                result.profile.firstname,
                "Alba"
            );
            assert.equal(
                result.profile.lastname,
                "Grey"
            );
            assert.equal(
                result.profile.birthday,
                "27 juillet 2026"
            );
            assert.equal(
                result.profile.occupation,
                "Avocate"
            );
            assert.equal(
                result.profile.creation_date,
                "1er ao\u00fbt 2026"
            );
            assert.equal(
                result.profile.alias,
                "Avocate Alba"
            );
            assert.equal(
                result.phone
                    .continuity_id,
                result.continuity.id
            );
            assert.equal(
                result.installation.status,
                "draft"
            );
            assert.equal(
                result.installation
                    .proxy_enabled,
                0
            );

            assert.throws(
                () =>
                    service.create({
                        discordUserId:
                            "discord-a",
                        guildId:
                            "guild-a",
                        guildName:
                            "Serveur A",
                        type:
                            "personnage_joue",
                        proxyName:
                            "Alba Proxy",
                        fullName:
                            "Autre Personne",
                        age: 25,
                        story:
                            "Une autre histoire"
                    }),
                /existe déjà/
            );

            const expectedCounts = {
                CharactersV2:
                    1,
                CharacterContinuitiesV2:
                    1,
                CharacterProfilesV2:
                    1,
                ContinuityPhonesV2:
                    1,
                CharacterGuildInstallationsV2:
                    1
            };

            for (
                const [
                    table,
                    expected
                ]
                of Object.entries(
                    expectedCounts
                )
            ) {
                assert.equal(
                    isolated.database
                        .prepare(`
                            SELECT COUNT(*)
                                AS count
                            FROM ${table}
                        `)
                        .get()
                        .count,
                    expected,
                    table
                );
            }
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "le tableau de bord conserve migration et recherche jouable",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createDashboardTables(
                isolated.database
            );

            const characters =
                new Map([
                    [
                        "character-a",
                        {
                            id:
                                "character-a",
                            proxy_name:
                                "Alba",
                            base_firstname:
                                "Alba",
                            base_lastname:
                                "Grey"
                        }
                    ],
                    [
                        "character-e",
                        {
                            id:
                                "character-e",
                            proxy_name:
                                "Émile",
                            base_firstname:
                                "Émile",
                            base_lastname:
                                "Azur"
                        }
                    ],
                    [
                        "character-p",
                        {
                            id: "character-p",
                            proxy_name: "Parent",
                            base_firstname: "Parent",
                            character_type: "pnj"
                        }
                    ]
                ]);

            const continuities =
                new Map([
                    [
                        "continuity-a",
                        {
                            id:
                                "continuity-a",
                            character_id:
                                "character-a",
                            name:
                                "GreyOS",
                            firstname:
                                "Alba",
                            lastname:
                                "Grey"
                        }
                    ],
                    [
                        "continuity-e",
                        {
                            id:
                                "continuity-e",
                            character_id:
                                "character-e",
                            name:
                                "Nouvelle vie",
                            firstname:
                                "Émile",
                            lastname:
                                "Azur"
                        }
                    ],
                    [
                        "continuity-p",
                        {
                            id: "continuity-p",
                            character_id: "character-p",
                            name: "GreyOS",
                            firstname: "Parent"
                        }
                    ]
                ]);

            stubDashboardManagers(
                characters,
                continuities
            );

            clearModule(
                "../src/v2/repositories/DashboardRepository"
            );
            clearModule(
                "../src/v2/services/dashboard/CharacterDashboardManager"
            );

            const manager =
                require(
                    "../src/v2/services/dashboard/CharacterDashboardManager"
                );

            assert.equal(
                manager
                    .resolveV2CharacterId(
                        "legacy-a"
                    ),
                "character-a"
            );
            assert.deepEqual(
                manager
                    .getInstalledCharactersForGuild(
                        "guild-a"
                    )
                    .map(
                        entry =>
                            entry.characterId
                    ),
                [
                    "character-e",
                    "character-a"
                ]
            );
            assert.deepEqual(
                manager
                    .searchPlayableCharactersForGuild(
                        "guild-a",
                        "emile"
                    )
                    .map(
                        entry =>
                            entry.characterId
                    ),
                [
                    "character-e"
                ]
            );
            assert.deepEqual(
                manager
                    .searchPlayableCharactersForGuild(
                        "guild-a",
                        "a",
                        {
                            excludeCharacterId:
                                "character-a"
                        }
                    )
                    .map(
                        entry =>
                            entry.characterId
                    ),
                [
                    "character-e"
                ]
            );
            assert.deepEqual(
                manager
                    .searchPlayableCharactersForGuild(
                        "guild-a",
                        " "
                    ),
                []
            );
            assert.deepEqual(
                manager
                    .searchPlayableCharactersForGuild(
                        "guild-a",
                        "parent"
                    ),
                []
            );
            assert.deepEqual(
                manager
                    .searchInstalledCharactersForGuild(
                        "guild-a",
                        "parent"
                    )
                    .map(entry => entry.characterId),
                ["character-p"]
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les services d’orchestration n’accèdent plus directement à la base",
    () => {
        const services = [
            [
                "src/v2/services/character/CharacterCreationV2Service.js",
                "OperationUnitOfWork"
            ],
            [
                "src/v2/services/deployment/DeploymentV2Service.js",
                "DeploymentRepository"
            ],
            [
                "src/v2/services/dashboard/CharacterDashboardManager.js",
                "DashboardRepository"
            ]
        ];

        for (
            const [
                file,
                dependency
            ]
            of services
        ) {
            const source =
                fs.readFileSync(
                    file,
                    "utf8"
                );

            assert.doesNotMatch(
                source,
                /\.prepare\s*\(/
            );
            assert.doesNotMatch(
                source,
                /\.transaction\s*\(/
            );
            assert.doesNotMatch(
                source,
                /database\/database/
            );
            assert.match(
                source,
                new RegExp(
                    dependency
                )
            );
        }
    }
);

test(
    "les accès SQL V2 restent confinés aux dépôts et migrations",
    () => {
        const v2Root =
            path.resolve(
                "src/v2"
            );

        const sourceFiles =
            listJavaScriptFiles(
                v2Root
            )
                .filter(
                    file => {
                        const relativeParts =
                            path.relative(
                                v2Root,
                                file
                            )
                                .split(
                                    path.sep
                                );

                        return (
                            !relativeParts
                                .includes(
                                    "repositories"
                                )
                            &&
                            !relativeParts
                                .includes(
                                    "migrations"
                                )
                        );
                    }
                );

        for (
            const file
            of sourceFiles
        ) {
            const source =
                fs.readFileSync(
                    file,
                    "utf8"
                );

            assert.doesNotMatch(
                source,
                /database\/database/,
                file
            );
            assert.doesNotMatch(
                source,
                /\.prepare\s*\(/,
                file
            );
        }
    }
);

function createDashboardTables(
    database
) {
    database.exec(`
        CREATE TABLE MigrationV1ToV2 (
            entity_type TEXT
                NOT NULL,
            old_id TEXT
                NOT NULL,
            new_id TEXT
                NOT NULL
        );

        CREATE TABLE CharactersV2 (
            id TEXT
                PRIMARY KEY,
            proxy_name TEXT
                NOT NULL,
            is_archived INTEGER
                NOT NULL
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL
        );

        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER
                PRIMARY KEY,
            character_id TEXT
                NOT NULL,
            continuity_id TEXT
                NOT NULL,
            guild_id TEXT
                NOT NULL,
            status TEXT
                NOT NULL,
            proxy_enabled INTEGER
                NOT NULL,
            installed_at TEXT
                NOT NULL
        );

        INSERT INTO MigrationV1ToV2 (
            entity_type,
            old_id,
            new_id
        )
        VALUES (
            'character',
            'legacy-a',
            'character-a'
        );

        INSERT INTO CharactersV2 (
            id,
            proxy_name,
            is_archived
        )
        VALUES
            (
                'character-a',
                'Alba',
                0
            ),
            (
                'character-e',
                'Émile',
                0
            ),
            (
                'character-old',
                'Archivé',
                1
            ),
            (
                'character-p',
                'Parent',
                0
            );

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id
        )
        VALUES
            (
                'continuity-a',
                'character-a'
            ),
            (
                'continuity-e',
                'character-e'
            ),
            (
                'continuity-old',
                'character-old'
            ),
            (
                'continuity-p',
                'character-p'
            );

        INSERT INTO CharacterGuildInstallationsV2 (
            id,
            character_id,
            continuity_id,
            guild_id,
            status,
            proxy_enabled,
            installed_at
        )
        VALUES
            (
                1,
                'character-e',
                'continuity-e',
                'guild-a',
                'approved',
                1,
                '2026-01-01'
            ),
            (
                2,
                'character-a',
                'continuity-a',
                'guild-a',
                'approved',
                1,
                '2026-01-02'
            ),
            (
                3,
                'character-old',
                'continuity-old',
                'guild-a',
                'approved',
                1,
                '2026-01-03'
            ),
            (
                4,
                'character-a',
                'continuity-a',
                'guild-b',
                'draft',
                0,
                '2026-01-04'
            ),
            (
                5,
                'character-p',
                'continuity-p',
                'guild-a',
                'approved',
                0,
                '2026-01-05'
            );
    `);
}

function stubDashboardManagers(
    characters,
    continuities
) {
    stubModule(
        "src/v2/managers/CharacterV2Manager.js",
        {
            getById:
                characterId =>
                    characters.get(
                        characterId
                    )
                    || null
        }
    );
    stubModule(
        "src/v2/managers/ContinuityV2Manager.js",
        {
            getById:
                continuityId =>
                    continuities.get(
                        continuityId
                    )
                    || null
        }
    );
    stubModule(
        "src/v2/managers/InstallationV2Manager.js",
        {}
    );
    stubModule(
        "src/v2/managers/ProfileV2Manager.js",
        {}
    );
    stubModule(
        "src/v2/managers/RelationshipV2Manager.js",
        {}
    );
    stubModule(
        "src/v2/managers/EncounterV2Manager.js",
        {}
    );
    stubModule(
        "src/v2/managers/StateV2Manager.js",
        {}
    );
}

function clearModule(
    modulePath
) {
    const resolved =
        require.resolve(
            modulePath
        );

    delete require.cache[
        resolved
    ];
}

function listJavaScriptFiles(
    directory
) {
    const files = [];

    for (
        const entry
        of fs.readdirSync(
            directory,
            {
                withFileTypes:
                    true
            }
        )
    ) {
        const absolutePath =
            path.join(
                directory,
                entry.name
            );

        if (entry.isDirectory()) {
            files.push(
                ...listJavaScriptFiles(
                    absolutePath
                )
            );
        } else if (
            entry.isFile()
            && entry.name
                .endsWith(
                    ".js"
                )
        ) {
            files.push(
                absolutePath
            );
        }
    }

    return files;
}
