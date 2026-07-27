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
    "l’ajout du type de SMS ne renomme plus les conversations",
    async () => {
        const isolated =
            createIsolatedDatabase();

        try {
            isolated.database
                .pragma(
                    "foreign_keys = OFF"
                );

            createPhoneSchema(
                isolated.database,
                {
                    includeMessageType:
                        false,
                    useLegacyReferences:
                        false
                }
            );

            await initializeMediaSchema();

            assert.equal(
                hasColumn(
                    isolated.database,
                    "PhoneMessagesV2",
                    "message_type"
                ),
                true
            );
            assert.equal(
                isolated.database
                    .prepare(`
                        SELECT message_type
                        FROM PhoneMessagesV2
                        WHERE id = 1
                    `)
                    .get()
                    .message_type,
                "text"
            );

            assertPhoneReferencesAreValid(
                isolated.database
            );
            assertPhoneDataIsPreserved(
                isolated.database
            );
        } finally {
            isolated.cleanup();
        }
    }
);

test(
    "les références Legacy laissées par l’ancienne migration sont réparées",
    async () => {
        const isolated =
            createIsolatedDatabase();

        try {
            isolated.database
                .pragma(
                    "foreign_keys = OFF"
                );

            createPhoneSchema(
                isolated.database,
                {
                    includeMessageType:
                        true,
                    useLegacyReferences:
                        true
                }
            );

            await initializeMediaSchema();

            assertPhoneReferencesAreValid(
                isolated.database
            );
            assertPhoneDataIsPreserved(
                isolated.database
            );
        } finally {
            isolated.cleanup();
        }
    }
);

async function initializeMediaSchema() {
    const schemaPath =
        require.resolve(
            "../src/database/schemaV2Media"
        );

    delete require.cache[
        schemaPath
    ];

    const initialize =
        require(
            "../src/database/schemaV2Media"
        );

    return withMutedConsole(
        () =>
            initialize()
    );
}

function createPhoneSchema(
    database,
    {
        includeMessageType,
        useLegacyReferences
    }
) {
    const conversationTarget =
        useLegacyReferences
            ? "PhoneConversationsV2_Legacy"
            : "PhoneConversationsV2";
    const messageTarget =
        useLegacyReferences
            ? "PhoneMessagesV2_Legacy"
            : "PhoneMessagesV2";
    const messageTypeColumn =
        includeMessageType
            ? `
                message_type TEXT
                    NOT NULL
                    DEFAULT 'text',
            `
            : "";

    database.exec(`
        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT
                PRIMARY KEY
        );

        CREATE TABLE ContinuityPhonesV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            continuity_id TEXT
                NOT NULL UNIQUE,
            phone_number TEXT
                NOT NULL UNIQUE,
            is_active INTEGER
                NOT NULL DEFAULT 1,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        CREATE TABLE PhoneConversationsV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            conversation_type TEXT
                NOT NULL DEFAULT 'private',
            name TEXT,
            owner_phone_id INTEGER,
            phone_a_id INTEGER,
            phone_b_id INTEGER,
            created_at TEXT
                NOT NULL,
            updated_at TEXT
                NOT NULL
        );

        CREATE TABLE PhoneMessagesV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER
                NOT NULL,
            sender_phone_id INTEGER,
            external_sender_name TEXT,
            external_sender_phone TEXT,
            content TEXT
                NOT NULL,
            ${messageTypeColumn}
            public_guild_id TEXT,
            public_channel_id TEXT,
            webhook_message_id TEXT,
            created_at TEXT
                NOT NULL,
            FOREIGN KEY(conversation_id)
                REFERENCES PhoneConversationsV2(id)
                ON DELETE CASCADE
        );

        CREATE TABLE
            PhoneConversationParticipantsV2 (
                id INTEGER
                    PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER
                    NOT NULL,
                phone_id INTEGER,
                external_name TEXT,
                external_phone TEXT,
                participant_type TEXT
                    NOT NULL DEFAULT 'greycore',
                is_admin INTEGER
                    NOT NULL DEFAULT 0,
                has_left INTEGER
                    NOT NULL DEFAULT 0,
                joined_at TEXT
                    NOT NULL,
                left_at TEXT,
                FOREIGN KEY(conversation_id)
                    REFERENCES ${conversationTarget}(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(phone_id)
                    REFERENCES ContinuityPhonesV2(id)
                    ON DELETE CASCADE
            );

        CREATE TABLE PhoneConversationReadsV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER
                NOT NULL,
            phone_id INTEGER
                NOT NULL,
            last_read_message_id INTEGER,
            unread_count INTEGER
                NOT NULL DEFAULT 0,
            last_read_at TEXT,
            updated_at TEXT
                NOT NULL,
            FOREIGN KEY(conversation_id)
                REFERENCES ${conversationTarget}(id)
                ON DELETE CASCADE,
            FOREIGN KEY(phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE,
            FOREIGN KEY(last_read_message_id)
                REFERENCES ${messageTarget}(id)
                ON DELETE SET NULL,
            UNIQUE(
                conversation_id,
                phone_id
            )
        );

        CREATE TABLE PhoneCallHistoryV2 (
            id INTEGER
                PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            caller_phone_id INTEGER,
            external_caller_name TEXT,
            external_caller_phone TEXT,
            call_type TEXT
                NOT NULL DEFAULT 'private',
            status TEXT
                NOT NULL DEFAULT 'started',
            started_at TEXT
                NOT NULL,
            answered_at TEXT,
            ended_at TEXT,
            created_at TEXT
                NOT NULL,
            FOREIGN KEY(conversation_id)
                REFERENCES ${conversationTarget}(id)
                ON DELETE SET NULL,
            FOREIGN KEY(caller_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE SET NULL
        );

        CREATE TABLE
            PhoneConversationSettingsV2 (
                id INTEGER
                    PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER
                    NOT NULL,
                phone_id INTEGER
                    NOT NULL,
                is_favorite INTEGER
                    NOT NULL DEFAULT 0,
                is_pinned INTEGER
                    NOT NULL DEFAULT 0,
                is_muted INTEGER
                    NOT NULL DEFAULT 0,
                is_hidden INTEGER
                    NOT NULL DEFAULT 0,
                created_at TEXT
                    NOT NULL,
                updated_at TEXT
                    NOT NULL,
                FOREIGN KEY(conversation_id)
                    REFERENCES ${conversationTarget}(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(phone_id)
                    REFERENCES ContinuityPhonesV2(id)
                    ON DELETE CASCADE,
                UNIQUE(
                    conversation_id,
                    phone_id
                )
            );

        INSERT INTO CharacterContinuitiesV2 (
            id
        )
        VALUES (
            'continuity-a'
        );

        INSERT INTO ContinuityPhonesV2 (
            id,
            continuity_id,
            phone_number,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            1,
            'continuity-a',
            '555-0001',
            1,
            '2026-01-01',
            '2026-01-01'
        );

        INSERT INTO PhoneConversationsV2 (
            id,
            conversation_type,
            owner_phone_id,
            phone_a_id,
            created_at,
            updated_at
        )
        VALUES (
            1,
            'private',
            1,
            1,
            '2026-01-01',
            '2026-01-01'
        );

        INSERT INTO PhoneMessagesV2 (
            id,
            conversation_id,
            sender_phone_id,
            content,
            created_at
        )
        VALUES (
            1,
            1,
            1,
            'Message conservé',
            '2026-01-01'
        );

        INSERT INTO
            PhoneConversationParticipantsV2 (
                id,
                conversation_id,
                phone_id,
                participant_type,
                is_admin,
                joined_at
            )
        VALUES (
            1,
            1,
            1,
            'greycore',
            1,
            '2026-01-01'
        );

        INSERT INTO PhoneConversationReadsV2 (
            id,
            conversation_id,
            phone_id,
            last_read_message_id,
            unread_count,
            updated_at
        )
        VALUES (
            1,
            1,
            1,
            1,
            0,
            '2026-01-01'
        );

        INSERT INTO PhoneCallHistoryV2 (
            id,
            conversation_id,
            caller_phone_id,
            call_type,
            status,
            started_at,
            created_at
        )
        VALUES (
            1,
            1,
            1,
            'private',
            'ended',
            '2026-01-01',
            '2026-01-01'
        );

        INSERT INTO
            PhoneConversationSettingsV2 (
                id,
                conversation_id,
                phone_id,
                created_at,
                updated_at
            )
        VALUES (
            1,
            1,
            1,
            '2026-01-01',
            '2026-01-01'
        );
    `);
}

function assertPhoneReferencesAreValid(
    database
) {
    const tables = [
        "PhoneConversationParticipantsV2",
        "PhoneConversationReadsV2",
        "PhoneCallHistoryV2",
        "PhoneConversationSettingsV2"
    ];

    for (
        const table
        of tables
    ) {
        const targets =
            database
                .prepare(`
                    PRAGMA foreign_key_list(
                        ${table}
                    )
                `)
                .all()
                .map(
                    foreignKey =>
                        foreignKey.table
                );

        assert.equal(
            targets.some(
                target =>
                    target.endsWith(
                        "_Legacy"
                    )
            ),
            false,
            table
        );
    }

    assert.deepEqual(
        database
            .prepare(`
                PRAGMA foreign_key_check
            `)
            .all(),
        []
    );
}

function assertPhoneDataIsPreserved(
    database
) {
    const tables = [
        "PhoneConversationsV2",
        "PhoneMessagesV2",
        "PhoneConversationParticipantsV2",
        "PhoneConversationReadsV2",
        "PhoneCallHistoryV2",
        "PhoneConversationSettingsV2"
    ];

    for (
        const table
        of tables
    ) {
        assert.equal(
            database
                .prepare(`
                    SELECT COUNT(*)
                        AS count
                    FROM ${table}
                `)
                .get()
                .count,
            1,
            table
        );
    }
}

function hasColumn(
    database,
    table,
    column
) {
    return database
        .prepare(`
            PRAGMA table_info(
                ${table}
            )
        `)
        .all()
        .some(
            entry =>
                entry.name ===
                    column
        );
}
