const fs =
    require("node:fs");
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

test(
    "les demandes de relation restent transactionnelles et protégées",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createRelationshipTables(
                isolated.database
            );

            const manager =
                loadManager();

            const request =
                manager.createRequest({
                    guildId:
                        "guild",
                    requesterContinuityId:
                        "continuity-a",
                    targetContinuityId:
                        "continuity-b",
                    relationshipTypeId:
                        1,
                    requestedBy:
                        "owner-a",
                    targetOwnerId:
                        "owner-b",
                    note:
                        "  Rencontrés au travail  ",
                    startedAt:
                        "2026-01-02"
                });

            assert.equal(
                request.status,
                "pending"
            );
            assert.equal(
                request.note,
                "Rencontrés au travail"
            );

            assert.throws(
                () =>
                    manager
                        .createRequest({
                            guildId:
                                "guild",
                            requesterContinuityId:
                                "continuity-b",
                            targetContinuityId:
                                "continuity-a",
                            relationshipTypeId:
                                1,
                            requestedBy:
                                "owner-b",
                            targetOwnerId:
                                "owner-a"
                        }),
                /déjà en attente/
            );

            assert.throws(
                () =>
                    manager
                        .acceptRequest(
                            request.id,
                            "intruder"
                        ),
                /propriétaire/
            );

            assert.equal(
                manager
                    .getRequestById(
                        request.id
                    )
                    .status,
                "pending"
            );

            const accepted =
                manager.acceptRequest(
                    request.id,
                    "owner-b"
                );

            assert.equal(
                accepted.request.status,
                "accepted"
            );
            assert.equal(
                accepted.relationship.note,
                "Rencontrés au travail"
            );

            const forRequester =
                manager
                    .getDisplayRelationships(
                        "continuity-a"
                    )[0];

            const forTarget =
                manager
                    .getDisplayRelationships(
                        "continuity-b"
                    )[0];

            assert.equal(
                forRequester
                    .otherCharacterName,
                "Icaro Salazar"
            );
            assert.equal(
                forRequester
                    .displayLabel,
                "Ami·e"
            );
            assert.equal(
                forTarget
                    .otherCharacterName,
                "Alba"
            );

            assert.throws(
                () =>
                    manager.create({
                        guildId:
                            "guild",
                        characterAId:
                            "character-b",
                        continuityAId:
                            "continuity-b",
                        characterBId:
                            "character-a",
                        continuityBId:
                            "continuity-a",
                        relationshipTypeId:
                            1,
                        createdBy:
                            "owner-b"
                    }),
                /existe déjà/
            );

            const rejectedRequest =
                manager.createRequest({
                    guildId:
                        "guild",
                    requesterContinuityId:
                        "continuity-a",
                    targetContinuityId:
                        "continuity-c",
                    relationshipTypeId:
                        2,
                    requestedBy:
                        "owner-a",
                    targetOwnerId:
                        "owner-c"
                });

            assert.equal(
                manager
                    .rejectRequest(
                        rejectedRequest.id,
                        "owner-c"
                    )
                    .status,
                "rejected"
            );

            const cancelledRequest =
                manager.createRequest({
                    guildId:
                        "guild",
                    requesterContinuityId:
                        "continuity-b",
                    targetContinuityId:
                        "continuity-c",
                    relationshipTypeId:
                        1,
                    requestedBy:
                        "owner-b",
                    targetOwnerId:
                        "owner-c"
                });

            manager.cancelPendingRequest(
                cancelledRequest.id
            );

            assert.equal(
                manager
                    .getRequestById(
                        cancelledRequest.id
                    ),
                undefined
            );

            assert.throws(
                () =>
                    manager
                        .createRequest({
                            guildId:
                                "guild",
                            requesterContinuityId:
                                "continuity-b",
                            targetContinuityId:
                                "continuity-c",
                            relationshipTypeId:
                                2,
                            requestedBy:
                                "owner-b",
                            targetOwnerId:
                                "owner-c",
                            startedAt:
                                "2026-02-30"
                        }),
                /date de début/
            );

            const ended =
                manager.end(
                    accepted
                        .relationship
                        .id
                );

            assert.ok(
                ended.ended_at
            );
            assert.equal(
                manager
                    .getForContinuity(
                        "continuity-a"
                    )
                    .length,
                0
            );

            assert.throws(
                () =>
                    manager.end(
                        ended.id
                    ),
                /déjà terminée/
            );

            assert.equal(
                manager.delete(
                    ended.id
                ).id,
                ended.id
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "l’initialisation complète une ancienne table Relations",
    async () => {
        const isolated =
            createIsolatedDatabase();

        try {
            isolated.database.exec(`
                CREATE TABLE ContinuityRelationshipsV2 (
                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,
                    continuity_a_id TEXT
                        NOT NULL,
                    continuity_b_id TEXT
                        NOT NULL,
                    relationship_type_id INTEGER
                        NOT NULL
                );

                CREATE TABLE PendingContinuityRelationshipsV2 (
                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,
                    requester_continuity_id TEXT
                        NOT NULL,
                    target_continuity_id TEXT
                        NOT NULL,
                    relationship_type_id INTEGER
                        NOT NULL,
                    requested_by TEXT
                        NOT NULL,
                    target_owner_id TEXT
                        NOT NULL,
                    status TEXT
                        NOT NULL DEFAULT 'pending',
                    created_at TEXT
                        NOT NULL,
                    responded_at TEXT,
                    responded_by TEXT
                );
            `);

            const schemaPath =
                require.resolve(
                    "../src/database/schemaV2Roleplay"
                );

            delete require.cache[
                schemaPath
            ];

            const initialize =
                require(
                    "../src/database/schemaV2Roleplay"
                );

            await withMutedConsole(
                () =>
                    initialize()
            );

            const relationshipColumns =
                getColumnNames(
                    isolated.database,
                    "ContinuityRelationshipsV2"
                );

            const requestColumns =
                getColumnNames(
                    isolated.database,
                    "PendingContinuityRelationshipsV2"
                );

            for (
                const column
                of [
                    "guild_id",
                    "character_a_id",
                    "character_b_id",
                    "note",
                    "started_at",
                    "ended_at",
                    "created_by",
                    "created_at",
                    "updated_at"
                ]
            ) {
                assert.equal(
                    relationshipColumns
                        .has(
                            column
                        ),
                    true
                );
            }

            assert.equal(
                requestColumns
                    .has(
                        "note"
                    ),
                true
            );
            assert.equal(
                requestColumns
                    .has(
                        "started_at"
                    ),
                true
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "le gestionnaire Relations ne contient plus de SQL ni de migration",
    () => {
        const source =
            fs.readFileSync(
                "src/v2/managers/RelationshipV2Manager.js",
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
        assert.doesNotMatch(
            source,
            /CREATE TABLE|ALTER TABLE/
        );
        assert.match(
            source,
            /RelationshipRepository/
        );
        assert.match(
            source,
            /RelationshipRequestRepository/
        );
    }
);

function createRelationshipTables(
    database
) {
    database.exec(`
        CREATE TABLE Guilds (
            id TEXT
                PRIMARY KEY
        );

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
            base_firstname TEXT,
            base_lastname TEXT
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL,
            firstname TEXT,
            lastname TEXT
        );

        CREATE TABLE CharacterProfilesV2 (
            continuity_id TEXT
                PRIMARY KEY,
            firstname TEXT,
            lastname TEXT,
            alias TEXT
        );

        CREATE TABLE RelationshipTypes (
            id INTEGER
                PRIMARY KEY,
            guild_id TEXT
                NOT NULL,
            key TEXT
                NOT NULL,
            label_a_to_b TEXT
                NOT NULL,
            label_b_to_a TEXT
                NOT NULL,
            is_symmetric INTEGER
                NOT NULL DEFAULT 0
        );

        CREATE TABLE ContinuityRelationshipsV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT
                NOT NULL,
            character_a_id TEXT
                NOT NULL,
            continuity_a_id TEXT
                NOT NULL,
            character_b_id TEXT
                NOT NULL,
            continuity_b_id TEXT
                NOT NULL,
            relationship_type_id INTEGER
                NOT NULL,
            note TEXT,
            started_at TEXT,
            ended_at TEXT,
            created_by TEXT
                NOT NULL,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        CREATE TABLE PendingContinuityRelationshipsV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            requester_continuity_id TEXT
                NOT NULL,
            target_continuity_id TEXT
                NOT NULL,
            relationship_type_id INTEGER
                NOT NULL,
            requested_by TEXT
                NOT NULL,
            target_owner_id TEXT
                NOT NULL,
            note TEXT,
            started_at TEXT,
            status TEXT
                NOT NULL DEFAULT 'pending',
            created_at TEXT
                NOT NULL,
            responded_at TEXT,
            responded_by TEXT
        );

        INSERT INTO Guilds (id)
        VALUES ('guild');

        INSERT INTO UsersV2 (
            id,
            discord_user_id
        )
        VALUES
            ('user-a', 'owner-a'),
            ('user-b', 'owner-b'),
            ('user-c', 'owner-c');

        INSERT INTO CharactersV2 (
            id,
            owner_user_id,
            proxy_name
        )
        VALUES
            ('character-a', 'user-a', 'Alba'),
            ('character-b', 'user-b', 'Beth'),
            ('character-c', 'user-c', 'Cora');

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id
        )
        VALUES
            ('continuity-a', 'character-a'),
            ('continuity-b', 'character-b'),
            ('continuity-c', 'character-c');

        INSERT INTO CharacterProfilesV2 (
            continuity_id,
            firstname,
            lastname,
            alias
        )
        VALUES (
            'continuity-b',
            'Icaro',
            'Salazar',
            NULL
        );

        INSERT INTO RelationshipTypes (
            id,
            guild_id,
            key,
            label_a_to_b,
            label_b_to_a,
            is_symmetric
        )
        VALUES
            (
                1,
                'guild',
                'friend',
                'Ami·e',
                'Ami·e',
                1
            ),
            (
                2,
                'guild',
                'parent',
                'Parent',
                'Enfant',
                0
            );
    `);
}

function loadManager() {
    const modules = [
        "../src/v2/repositories/RelationshipTypeRepository",
        "../src/v2/repositories/RelationshipRepository",
        "../src/v2/repositories/RelationshipRequestRepository",
        "../src/v2/repositories/RelationshipUnitOfWork",
        "../src/v2/managers/RelationshipV2Manager"
    ];

    for (
        const modulePath
        of modules
    ) {
        delete require.cache[
            require.resolve(
                modulePath
            )
        ];
    }

    return require(
        "../src/v2/managers/RelationshipV2Manager"
    );
}

function getColumnNames(
    database,
    tableName
) {
    return new Set(
        database
            .prepare(
                `PRAGMA table_info(${tableName})`
            )
            .all()
            .map(
                column =>
                    column.name
            )
    );
}
