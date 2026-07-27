const fs =
    require("node:fs");
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
    "les états conservent leur cycle de vie et leurs validations",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createStateTables(
                isolated.database
            );

            const manager =
                loadManager(
                    "State"
                );

            const state =
                manager.create({
                    continuityId:
                        "continuity-a",
                    stateTypeId:
                        1,
                    guildId:
                        "guild-a",
                    createdBy:
                        "owner-a",
                    note:
                        "  En mission  ",
                    startedAt:
                        "2026-01-02"
                });

            assert.equal(
                state.note,
                "En mission"
            );
            assert.equal(
                state.started_at,
                "2026-01-02"
            );
            assert.equal(
                manager
                    .getActiveStates(
                        "continuity-a"
                    )
                    .length,
                1
            );

            assert.throws(
                () =>
                    manager.create({
                        continuityId:
                            "continuity-a",
                        stateTypeId:
                            1,
                        guildId:
                            "guild-a",
                        createdBy:
                            "owner-a"
                    }),
                /déjà cet état/
            );

            assert.throws(
                () =>
                    manager.create({
                        continuityId:
                            "continuity-a",
                        stateTypeId:
                            2,
                        guildId:
                            "guild-a",
                        createdBy:
                            "owner-a"
                    }),
                /n’appartient pas/
            );

            assert.throws(
                () =>
                    manager.create({
                        continuityId:
                            "continuity-a",
                        stateTypeId:
                            3,
                        guildId:
                            "guild-a",
                        createdBy:
                            "owner-a",
                        startedAt:
                            "2026-02-30"
                    }),
                /date de début/
            );

            const updated =
                manager.updateState(
                    state.id,
                    {
                        note:
                            "  Repos  ",
                        startedAt:
                            "2026-02-03"
                    }
                );

            assert.equal(
                updated.note,
                "Repos"
            );
            assert.equal(
                updated.started_at,
                "2026-02-03"
            );

            const ended =
                manager.end(
                    state.id
                );

            assert.ok(
                ended.ended_at
            );
            assert.equal(
                manager
                    .getActiveStates(
                        "continuity-a"
                    )
                    .length,
                0
            );
            assert.equal(
                manager
                    .getHistory(
                        "continuity-a"
                    )
                    .length,
                1
            );

            assert.throws(
                () =>
                    manager.end(
                        state.id
                    ),
                /déjà terminé/
            );

            assert.equal(
                manager.deleteState(
                    state.id
                ).id,
                state.id
            );
            assert.equal(
                manager.getById(
                    state.id
                ),
                undefined
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "le profil courant alimente la fiche de validation du staff",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createProfileTables(
                isolated.database
            );

            const manager =
                loadManager(
                    "Profile"
                );

            manager.create({
                continuityId:
                    "continuity-a",
                firstname:
                    "Alba",
                lastname:
                    "Grey",
                age:
                    23,
                gang:
                    "La Mano de Dios",
                story:
                    "Histoire actuelle"
            });

            const updated =
                manager.update(
                    "continuity-a",
                    {
                        firstname:
                            "Alba-Rose",
                        story:
                            null
                    }
                );

            assert.equal(
                updated.firstname,
                "Alba-Rose"
            );
            assert.equal(
                updated.lastname,
                "Grey"
            );
            assert.equal(
                updated.story,
                null
            );

            clearModule(
                "../src/v2/repositories/ValidationRepository"
            );

            const validationRepository =
                require(
                    "../src/v2/repositories/ValidationRepository"
                );

            const context =
                validationRepository
                    .getInstallationContext(
                        1
                    );

            assert.equal(
                context.firstname,
                "Alba-Rose"
            );
            assert.equal(
                context.lastname,
                "Grey"
            );
            assert.equal(
                context.age,
                23
            );
            assert.equal(
                context.gang,
                "La Mano de Dios"
            );
            assert.equal(
                context.story,
                null
            );

            isolated.database
                .prepare(`
                    DELETE FROM
                        CharacterProfilesV2
                    WHERE continuity_id = ?
                `)
                .run(
                    "continuity-a"
                );

            const legacyContext =
                validationRepository
                    .getInstallationContext(
                        1
                    );

            assert.equal(
                legacyContext.firstname,
                "Ancien prénom"
            );
            assert.equal(
                legacyContext.story,
                "Ancienne histoire"
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les tenues conservent une seule tenue courante",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createOutfitTables(
                isolated.database
            );

            const manager =
                loadManager(
                    "Outfit"
                );

            const first =
                manager.createCurrent({
                    continuityId:
                        "continuity-a",
                    imageUrl:
                        " https://example.com/one.png ",
                    title:
                        "  Première tenue  ",
                    createdAt:
                        "2026-01-01T00:00:00.000Z",
                    updatedAt:
                        "2026-01-01T00:00:00.000Z"
                });

            const second =
                manager.createCurrent({
                    continuityId:
                        "continuity-a",
                    imageUrl:
                        "https://example.com/two.png",
                    title:
                        "Seconde tenue",
                    createdAt:
                        "2026-02-01T00:00:00.000Z",
                    updatedAt:
                        "2026-02-01T00:00:00.000Z"
                });

            assert.equal(
                first.image_url,
                "https://example.com/one.png"
            );
            assert.equal(
                manager
                    .getById(
                        first.id
                    )
                    .is_current,
                0
            );
            assert.equal(
                manager
                    .getCurrent(
                        "continuity-a"
                    )
                    .id,
                second.id
            );

            const selected =
                manager.setCurrent(
                    first.id
                );

            assert.equal(
                selected.is_current,
                1
            );
            assert.equal(
                manager
                    .getById(
                        second.id
                    )
                    .is_current,
                0
            );

            const updated =
                manager.updateDetails(
                    first.id,
                    {
                        title:
                            "  Tenue finale  ",
                        description:
                            "  Pour la mission  "
                    }
                );

            assert.equal(
                updated.title,
                "Tenue finale"
            );
            assert.equal(
                updated.description,
                "Pour la mission"
            );
            assert.deepEqual(
                manager
                    .getForContinuity(
                        "continuity-a"
                    )
                    .map(
                        outfit =>
                            outfit.id
                    ),
                [
                    first.id,
                    second.id
                ]
            );

            assert.throws(
                () =>
                    manager.createCurrent({
                        continuityId:
                            "missing",
                        imageUrl:
                            "https://example.com/missing.png"
                    }),
                /Continuité introuvable/
            );
            assert.throws(
                () =>
                    manager.createCurrent({
                        continuityId:
                            "continuity-a",
                        imageUrl:
                            " "
                    }),
                /image de la tenue/
            );

            assert.equal(
                manager.delete(
                    second.id
                ).id,
                second.id
            );
            assert.equal(
                manager.getById(
                    second.id
                ),
                undefined
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les gestionnaires de données RP ne contiennent plus de requête SQL",
    () => {
        const managers = [
            "State",
            "Profile",
            "Outfit"
        ];

        for (
            const name
            of managers
        ) {
            const source =
                fs.readFileSync(
                    `src/v2/managers/${name}V2Manager.js`,
                    "utf8"
                );

            assert.doesNotMatch(
                source,
                /\.prepare\s*\(/
            );
            assert.doesNotMatch(
                source,
                /database\/database/
            );
            assert.match(
                source,
                new RegExp(
                    `${name}Repository`
                )
            );
        }
    }
);

function createStateTables(
    database
) {
    database.exec(`
        CREATE TABLE StateTypes (
            id INTEGER
                PRIMARY KEY,
            guild_id TEXT
                NOT NULL,
            name TEXT
                NOT NULL,
            emoji TEXT,
            color TEXT
        );

        CREATE TABLE ContinuityStatesV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            continuity_id TEXT
                NOT NULL,
            state_type_id INTEGER
                NOT NULL,
            note TEXT,
            started_at TEXT
                NOT NULL,
            ended_at TEXT,
            created_by TEXT
                NOT NULL,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        INSERT INTO StateTypes (
            id,
            guild_id,
            name
        )
        VALUES
            (1, 'guild-a', 'Actif'),
            (2, 'guild-b', 'Absent'),
            (3, 'guild-a', 'Blessé');
    `);
}

function createProfileTables(
    database
) {
    database.exec(`
        CREATE TABLE UsersV2 (
            id TEXT
                PRIMARY KEY,
            discord_user_id TEXT
                NOT NULL
        );

        CREATE TABLE CharactersV2 (
            id TEXT
                PRIMARY KEY,
            owner_user_id TEXT
                NOT NULL,
            proxy_name TEXT
                NOT NULL,
            character_type TEXT
                NOT NULL,
            avatar_url TEXT
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL,
            name TEXT
                NOT NULL,
            firstname TEXT,
            lastname TEXT,
            age INTEGER,
            gang TEXT,
            story TEXT
        );

        CREATE TABLE CharacterProfilesV2 (
            continuity_id TEXT
                PRIMARY KEY,
            firstname TEXT,
            lastname TEXT,
            age INTEGER,
            gender TEXT,
            height TEXT,
            weight TEXT,
            birthday TEXT,
            origin TEXT,
            occupation TEXT,
            gang TEXT,
            faceclaim TEXT,
            story TEXT,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
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
                NOT NULL
        );

        INSERT INTO UsersV2 (
            id,
            discord_user_id
        )
        VALUES (
            'user-a',
            'discord-a'
        );

        INSERT INTO CharactersV2 (
            id,
            owner_user_id,
            proxy_name,
            character_type,
            avatar_url
        )
        VALUES (
            'character-a',
            'user-a',
            'Proxy Alba',
            'pnj',
            'https://example.com/avatar.png'
        );

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id,
            name,
            firstname,
            lastname,
            age,
            gang,
            story
        )
        VALUES (
            'continuity-a',
            'character-a',
            'GreyOS',
            'Ancien prénom',
            'Ancien nom',
            19,
            'Ancien groupe',
            'Ancienne histoire'
        );

        INSERT INTO CharacterGuildInstallationsV2 (
            id,
            character_id,
            continuity_id,
            guild_id,
            status
        )
        VALUES (
            1,
            'character-a',
            'continuity-a',
            'guild-a',
            'pending'
        );
    `);
}

function createOutfitTables(
    database
) {
    database.exec(`
        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY
        );

        CREATE TABLE ContinuityOutfitsV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            continuity_id TEXT
                NOT NULL,
            image_url TEXT
                NOT NULL,
            title TEXT,
            description TEXT,
            is_current INTEGER
                NOT NULL DEFAULT 1,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        INSERT INTO CharacterContinuitiesV2 (
            id
        )
        VALUES (
            'continuity-a'
        );
    `);
}

function loadManager(
    name
) {
    clearModule(
        `../src/v2/repositories/${name}Repository`
    );
    clearModule(
        `../src/v2/managers/${name}V2Manager`
    );

    return require(
        `../src/v2/managers/${name}V2Manager`
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
