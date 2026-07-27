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
    "la bibliothèque conserve recherche, compteurs et statistiques",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createLibraryTables(
                isolated.database
            );

            const manager =
                loadManager(
                    "Library",
                    "Library"
                );

            const characters =
                manager.getCharacters(
                    1
                );

            assert.deepEqual(
                characters.map(
                    character =>
                        character.proxy_name
                ),
                [
                    "Alba",
                    "Zulu"
                ]
            );
            assert.equal(
                characters[0]
                    .continuity_count,
                2
            );
            assert.equal(
                characters[0]
                    .installation_count,
                1
            );
            assert.deepEqual(
                manager
                    .searchCharacters(
                        1,
                        "  grey  "
                    )
                    .map(
                        character =>
                            character.id
                    ),
                [
                    "character-a"
                ]
            );
            assert.equal(
                manager
                    .getCharacter(
                        "character-a"
                    )
                    .discord_user_id,
                "discord-a"
            );
            assert.equal(
                manager
                    .getCharacterForUser(
                        "character-a",
                        2
                    ),
                undefined
            );
            assert.deepEqual(
                manager
                    .getContinuities(
                        "character-a"
                    )
                    .map(
                        continuity =>
                            continuity.id
                    ),
                [
                    "continuity-a1",
                    "continuity-a2"
                ]
            );
            assert.deepEqual(
                manager.getStatistics(
                    1
                ),
                {
                    characters:
                        2,
                    archived:
                        1,
                    continuities:
                        3,
                    installations:
                        2
                }
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les SMS conservent création, ordre, publication et suppression",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createPhoneMessageTables(
                isolated.database
            );

            const manager =
                loadManager(
                    "PhoneMessage",
                    "PhoneMessageV2"
                );

            const first =
                manager.create({
                    conversationId:
                        10,
                    senderPhoneId:
                        1,
                    content:
                        "Premier message",
                    messageType:
                        "text"
                });

            assert.equal(
                first.message_type,
                "text"
            );
            assert.ok(
                first.created_at
            );

            const second =
                manager.insert({
                    conversationId:
                        10,
                    senderPhoneId:
                        1,
                    content:
                        "Second message",
                    publicGuildId:
                        null,
                    publicChannelId:
                        null,
                    webhookMessageId:
                        null,
                    createdAt:
                        "2099-01-01T00:00:00.000Z"
                });

            assert.deepEqual(
                manager
                    .getForConversation(
                        10
                    )
                    .map(
                        message =>
                            message.id
                    ),
                [
                    first.id,
                    second.id
                ]
            );

            const published =
                manager.updatePublication(
                    second.id,
                    {
                        publicGuildId:
                            "guild-a",
                        publicChannelId:
                            "channel-a",
                        webhookMessageId:
                            "message-a"
                    }
                );

            assert.equal(
                published
                    .public_channel_id,
                "channel-a"
            );
            assert.equal(
                manager.delete(
                    first.id
                ).content,
                "Premier message"
            );
            assert.throws(
                () =>
                    manager.delete(
                        first.id
                    ),
                /Message introuvable/
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "bibliothèque et recherche Téléphone ne contiennent plus de requête SQL métier",
    () => {
        const files = [
            [
                "src/v2/managers/LibraryManager.js",
                "LibraryRepository"
            ],
            [
                "src/v2/managers/PhoneMessageV2Manager.js",
                "PhoneMessageRepository"
            ],
            [
                "src/v2/managers/PhoneSearchV2Manager.js",
                "PhoneSearchRepository"
            ],
            [
                "src/v2/managers/phoneSearch/PhoneGreycoreSearchSource.js",
                "PhoneSearchRepository"
            ]
        ];

        for (
            const [
                file,
                repositoryName
            ]
            of files
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
                /database\/database/
            );
            assert.match(
                source,
                new RegExp(
                    repositoryName
                )
            );
        }
    }
);

function createLibraryTables(
    database
) {
    database.exec(`
        CREATE TABLE UsersV2 (
            id INTEGER
                PRIMARY KEY,
            discord_user_id TEXT
                NOT NULL
        );

        CREATE TABLE CharactersV2 (
            id TEXT
                PRIMARY KEY,
            owner_user_id INTEGER
                NOT NULL,
            proxy_name TEXT
                NOT NULL,
            avatar_url TEXT,
            base_firstname TEXT,
            base_lastname TEXT,
            is_archived INTEGER
                NOT NULL,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL,
            is_archived INTEGER
                NOT NULL,
            created_at TEXT
                NOT NULL
        );

        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER
                PRIMARY KEY,
            character_id TEXT
                NOT NULL,
            continuity_id TEXT
                NOT NULL,
            status TEXT
                NOT NULL
        );

        INSERT INTO UsersV2 (
            id,
            discord_user_id
        )
        VALUES
            (1, 'discord-a'),
            (2, 'discord-b');

        INSERT INTO CharactersV2 (
            id,
            owner_user_id,
            proxy_name,
            avatar_url,
            base_firstname,
            base_lastname,
            is_archived,
            created_at,
            updated_at
        )
        VALUES
            (
                'character-a',
                1,
                'Alba',
                NULL,
                'Alba',
                'Grey',
                0,
                '2026-01-01',
                '2026-01-01'
            ),
            (
                'character-z',
                1,
                'Zulu',
                NULL,
                'Zoé',
                'Zulu',
                0,
                '2026-01-02',
                '2026-01-02'
            ),
            (
                'character-old',
                1,
                'Ancienne',
                NULL,
                'Old',
                'Grey',
                1,
                '2026-01-03',
                '2026-01-03'
            );

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id,
            is_archived,
            created_at
        )
        VALUES
            (
                'continuity-a1',
                'character-a',
                0,
                '2026-01-01'
            ),
            (
                'continuity-a2',
                'character-a',
                1,
                '2026-01-02'
            ),
            (
                'continuity-z',
                'character-z',
                0,
                '2026-01-03'
            ),
            (
                'continuity-old',
                'character-old',
                0,
                '2026-01-04'
            );

        INSERT INTO CharacterGuildInstallationsV2 (
            id,
            character_id,
            continuity_id,
            status
        )
        VALUES
            (
                1,
                'character-a',
                'continuity-a1',
                'approved'
            ),
            (
                2,
                'character-a',
                'continuity-a2',
                'archived'
            ),
            (
                3,
                'character-z',
                'continuity-z',
                'approved'
            ),
            (
                4,
                'character-old',
                'continuity-old',
                'archived'
            );
    `);
}

function createPhoneMessageTables(
    database
) {
    database.exec(`
        CREATE TABLE CharactersV2 (
            id TEXT
                PRIMARY KEY,
            proxy_name TEXT
                NOT NULL,
            avatar_url TEXT
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY,
            character_id TEXT
                NOT NULL
        );

        CREATE TABLE ContinuityPhonesV2 (
            id INTEGER
                PRIMARY KEY,
            continuity_id TEXT
                NOT NULL,
            phone_number TEXT
                NOT NULL
        );

        CREATE TABLE PhoneMessagesV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER
                NOT NULL,
            sender_phone_id INTEGER,
            content TEXT
                NOT NULL,
            message_type TEXT
                NOT NULL DEFAULT 'text',
            media_url TEXT,
            media_content_type TEXT,
            public_guild_id TEXT,
            public_channel_id TEXT,
            webhook_message_id TEXT,
            created_at TEXT
                NOT NULL
        );

        INSERT INTO CharactersV2 (
            id,
            proxy_name,
            avatar_url
        )
        VALUES (
            'character-a',
            'Alba',
            'https://example.com/alba.png'
        );

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id
        )
        VALUES (
            'continuity-a',
            'character-a'
        );

        INSERT INTO ContinuityPhonesV2 (
            id,
            continuity_id,
            phone_number
        )
        VALUES (
            1,
            'continuity-a',
            '555-0001'
        );
    `);
}

function loadManager(
    repositoryName,
    managerName
) {
    clearModule(
        `../src/v2/repositories/${repositoryName}Repository`
    );
    clearModule(
        `../src/v2/managers/${managerName}Manager`
    );

    return require(
        `../src/v2/managers/${managerName}Manager`
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
