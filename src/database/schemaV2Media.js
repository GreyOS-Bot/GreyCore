const db =
    require("./database");

/*
 * Vérifie si une table existe.
 */
function tableExists(tableName) {
    return Boolean(
        db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            AND name = ?
        `).get(tableName)
    );
}

/*
 * Retourne les colonnes d’une table.
 */
function getTableColumns(tableName) {
    if (!tableExists(tableName)) {
        return [];
    }

    return db.prepare(`
        PRAGMA table_info(${tableName})
    `).all();
}

/*
 * Vérifie si une colonne existe.
 */
function hasColumn(
    tableName,
    columnName
) {
    return getTableColumns(tableName)
        .some(
            column =>
                column.name === columnName
        );
}

/*
 * Crée la nouvelle structure
 * des conversations.
 *
 * phone_a_id et phone_b_id restent présents
 * pour conserver la compatibilité avec
 * le PhoneV2Manager actuel.
 *
 * Ils deviennent toutefois facultatifs
 * afin d’autoriser les conversations de groupe.
 */
function createPhoneConversationsTable() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PhoneConversationsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_type TEXT
                NOT NULL
                DEFAULT 'private',

            name TEXT,

            owner_phone_id INTEGER,

            phone_a_id INTEGER,
            phone_b_id INTEGER,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(owner_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE SET NULL,

            FOREIGN KEY(phone_a_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(phone_b_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE,

            CHECK (
                conversation_type IN (
                    'private',
                    'group'
                )
            )
        )
    `).run();
}

/*
 * Crée la nouvelle structure
 * des messages.
 *
 * sender_phone_id devient facultatif
 * pour permettre les messages provenant
 * de personnages externes.
 */
function createPhoneMessagesTable() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PhoneMessagesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_id INTEGER NOT NULL,

            sender_phone_id INTEGER,

            external_sender_name TEXT,
            external_sender_phone TEXT,

            content TEXT NOT NULL,

            message_type TEXT
                NOT NULL
                DEFAULT 'text',

            media_url TEXT,
            media_content_type TEXT,

            public_guild_id TEXT,
            public_channel_id TEXT,

            webhook_message_id TEXT,

            created_at TEXT NOT NULL,

            FOREIGN KEY(conversation_id)
                REFERENCES PhoneConversationsV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(sender_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE SET NULL
        )
    `).run();
}

function ensurePhoneMessageColumns() {
    if (
        !hasColumn(
            "PhoneMessagesV2",
            "message_type"
        )
    ) {
        db.prepare(`
            ALTER TABLE PhoneMessagesV2
            ADD COLUMN message_type TEXT
                NOT NULL
                DEFAULT 'text'
        `).run();
    }

    if (
        !hasColumn(
            "PhoneMessagesV2",
            "media_url"
        )
    ) {
        db.prepare(`
            ALTER TABLE PhoneMessagesV2
            ADD COLUMN media_url TEXT
        `).run();
    }

    if (
        !hasColumn(
            "PhoneMessagesV2",
            "media_content_type"
        )
    ) {
        db.prepare(`
            ALTER TABLE PhoneMessagesV2
            ADD COLUMN media_content_type TEXT
        `).run();
    }
}

/*
 * Migre les anciennes tables Téléphone V2
 * vers la nouvelle structure sans supprimer
 * les conversations et messages existants.
 */
function migratePhoneSchema() {
    const conversationsExist =
        tableExists(
            "PhoneConversationsV2"
        );

    const messagesExist =
        tableExists(
            "PhoneMessagesV2"
        );

    const conversationsNeedMigration =
        conversationsExist
        &&
        (
            !hasColumn(
                "PhoneConversationsV2",
                "conversation_type"
            )
            ||
            !hasColumn(
                "PhoneConversationsV2",
                "name"
            )
            ||
            !hasColumn(
                "PhoneConversationsV2",
                "owner_phone_id"
            )
        );

    const messagesNeedMigration =
        messagesExist
        &&
        (
            !hasColumn(
                "PhoneMessagesV2",
                "external_sender_name"
            )
            ||
            !hasColumn(
                "PhoneMessagesV2",
                "external_sender_phone"
            )
        );

    if (
        !conversationsNeedMigration
        &&
        !messagesNeedMigration
    ) {
        createPhoneConversationsTable();
        createPhoneMessagesTable();
        ensurePhoneMessageColumns();

        return;
    }

    console.log(
        "🔄 Migration du Téléphone V2..."
    );

    db.pragma(
        "foreign_keys = OFF"
    );
    db.pragma(
        "legacy_alter_table = ON"
    );

    const migration =
        db.transaction(() => {

            /*
             * On sauvegarde d’abord les messages,
             * car ils dépendent des conversations.
             */
            if (
                messagesExist
                && messagesNeedMigration
            ) {
                db.prepare(`
                    ALTER TABLE PhoneMessagesV2
                    RENAME TO PhoneMessagesV2_Legacy
                `).run();
            }

            if (
                conversationsExist
                && conversationsNeedMigration
            ) {
                db.prepare(`
                    ALTER TABLE PhoneConversationsV2
                    RENAME TO PhoneConversationsV2_Legacy
                `).run();
            }

            createPhoneConversationsTable();
            createPhoneMessagesTable();
            ensurePhoneMessageColumns();

            /*
             * Conservation des anciennes
             * conversations privées.
             */
            if (
                tableExists(
                    "PhoneConversationsV2_Legacy"
                )
            ) {
                const legacyHasType =
                    hasColumn(
                        "PhoneConversationsV2_Legacy",
                        "conversation_type"
                    );

                const legacyHasName =
                    hasColumn(
                        "PhoneConversationsV2_Legacy",
                        "name"
                    );

                const legacyHasOwner =
                    hasColumn(
                        "PhoneConversationsV2_Legacy",
                        "owner_phone_id"
                    );

                db.prepare(`
                    INSERT INTO PhoneConversationsV2 (
                        id,
                        conversation_type,
                        name,
                        owner_phone_id,
                        phone_a_id,
                        phone_b_id,
                        created_at,
                        updated_at
                    )
                    SELECT
                        id,

                        ${
                            legacyHasType
                                ? "COALESCE(conversation_type, 'private')"
                                : "'private'"
                        },

                        ${
                            legacyHasName
                                ? "name"
                                : "NULL"
                        },

                        ${
                            legacyHasOwner
                                ? "owner_phone_id"
                                : "phone_a_id"
                        },

                        phone_a_id,
                        phone_b_id,
                        created_at,
                        updated_at

                    FROM PhoneConversationsV2_Legacy
                `).run();
            }

            /*
             * Conservation des anciens SMS.
             */
            if (
                tableExists(
                    "PhoneMessagesV2_Legacy"
                )
            ) {
                const legacyHasExternalName =
                    hasColumn(
                        "PhoneMessagesV2_Legacy",
                        "external_sender_name"
                    );

                const legacyHasExternalPhone =
                    hasColumn(
                        "PhoneMessagesV2_Legacy",
                        "external_sender_phone"
                    );

                db.prepare(`
                    INSERT INTO PhoneMessagesV2 (
                        id,
                        conversation_id,
                        sender_phone_id,
                        external_sender_name,
                        external_sender_phone,
                        content,
                        public_guild_id,
                        public_channel_id,
                        webhook_message_id,
                        created_at
                    )
                    SELECT
                        id,
                        conversation_id,
                        sender_phone_id,

                        ${
                            legacyHasExternalName
                                ? "external_sender_name"
                                : "NULL"
                        },

                        ${
                            legacyHasExternalPhone
                                ? "external_sender_phone"
                                : "NULL"
                        },

                        content,
                        public_guild_id,
                        public_channel_id,
                        webhook_message_id,
                        created_at

                    FROM PhoneMessagesV2_Legacy
                `).run();
            }

            if (
                tableExists(
                    "PhoneMessagesV2_Legacy"
                )
            ) {
                db.prepare(`
                    DROP TABLE PhoneMessagesV2_Legacy
                `).run();
            }

            if (
                tableExists(
                    "PhoneConversationsV2_Legacy"
                )
            ) {
                db.prepare(`
                    DROP TABLE PhoneConversationsV2_Legacy
                `).run();
            }
        });

    try {
        migration();

        console.log(
            "✅ Migration du Téléphone V2 terminée."
        );

    } finally {
        db.pragma(
            "legacy_alter_table = OFF"
        );
        db.pragma(
            "foreign_keys = ON"
        );
    }
}

const PHONE_FOREIGN_KEY_REPAIRS = [
    {
        table:
            "PhoneConversationParticipantsV2",
        columns: [
            "id",
            "conversation_id",
            "phone_id",
            "external_name",
            "external_phone",
            "participant_type",
            "is_admin",
            "has_left",
            "joined_at",
            "left_at"
        ],
        createSql: `
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
                        NOT NULL
                        DEFAULT 'greycore',
                    is_admin INTEGER
                        NOT NULL
                        DEFAULT 0,
                    has_left INTEGER
                        NOT NULL
                        DEFAULT 0,
                    joined_at TEXT
                        NOT NULL,
                    left_at TEXT,

                    FOREIGN KEY(conversation_id)
                        REFERENCES PhoneConversationsV2(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY(phone_id)
                        REFERENCES ContinuityPhonesV2(id)
                        ON DELETE CASCADE,

                    CHECK (
                        participant_type IN (
                            'greycore',
                            'external',
                            'plural',
                            'tupperbox',
                            'npc'
                        )
                    ),
                    CHECK (
                        phone_id IS NOT NULL
                        OR external_name IS NOT NULL
                        OR external_phone IS NOT NULL
                    )
                )
        `
    },
    {
        table:
            "PhoneConversationReadsV2",
        columns: [
            "id",
            "conversation_id",
            "phone_id",
            "last_read_message_id",
            "unread_count",
            "last_read_at",
            "updated_at"
        ],
        createSql: `
            CREATE TABLE PhoneConversationReadsV2 (
                id INTEGER
                    PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER
                    NOT NULL,
                phone_id INTEGER
                    NOT NULL,
                last_read_message_id INTEGER,
                unread_count INTEGER
                    NOT NULL
                    DEFAULT 0,
                last_read_at TEXT,
                updated_at TEXT
                    NOT NULL,

                FOREIGN KEY(conversation_id)
                    REFERENCES PhoneConversationsV2(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(phone_id)
                    REFERENCES ContinuityPhonesV2(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(last_read_message_id)
                    REFERENCES PhoneMessagesV2(id)
                    ON DELETE SET NULL,

                UNIQUE(
                    conversation_id,
                    phone_id
                )
            )
        `
    },
    {
        table:
            "PhoneCallHistoryV2",
        columns: [
            "id",
            "conversation_id",
            "caller_phone_id",
            "external_caller_name",
            "external_caller_phone",
            "call_type",
            "status",
            "started_at",
            "answered_at",
            "ended_at",
            "created_at"
        ],
        createSql: `
            CREATE TABLE PhoneCallHistoryV2 (
                id INTEGER
                    PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER,
                caller_phone_id INTEGER,
                external_caller_name TEXT,
                external_caller_phone TEXT,
                call_type TEXT
                    NOT NULL
                    DEFAULT 'private',
                status TEXT
                    NOT NULL
                    DEFAULT 'started',
                started_at TEXT
                    NOT NULL,
                answered_at TEXT,
                ended_at TEXT,
                created_at TEXT
                    NOT NULL,

                FOREIGN KEY(conversation_id)
                    REFERENCES PhoneConversationsV2(id)
                    ON DELETE SET NULL,
                FOREIGN KEY(caller_phone_id)
                    REFERENCES ContinuityPhonesV2(id)
                    ON DELETE SET NULL,

                CHECK (
                    call_type IN (
                        'private',
                        'group'
                    )
                ),
                CHECK (
                    status IN (
                        'started',
                        'ringing',
                        'answered',
                        'missed',
                        'declined',
                        'cancelled',
                        'ended'
                    )
                )
            )
        `
    },
    {
        table:
            "PhoneConversationSettingsV2",
        columns: [
            "id",
            "conversation_id",
            "phone_id",
            "is_favorite",
            "is_pinned",
            "is_muted",
            "is_hidden",
            "created_at",
            "updated_at"
        ],
        createSql: `
            CREATE TABLE
                PhoneConversationSettingsV2 (
                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER
                        NOT NULL,
                    phone_id INTEGER
                        NOT NULL,
                    is_favorite INTEGER
                        NOT NULL
                        DEFAULT 0,
                    is_pinned INTEGER
                        NOT NULL
                        DEFAULT 0,
                    is_muted INTEGER
                        NOT NULL
                        DEFAULT 0,
                    is_hidden INTEGER
                        NOT NULL
                        DEFAULT 0,
                    created_at TEXT
                        NOT NULL,
                    updated_at TEXT
                        NOT NULL,

                    FOREIGN KEY(conversation_id)
                        REFERENCES PhoneConversationsV2(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY(phone_id)
                        REFERENCES ContinuityPhonesV2(id)
                        ON DELETE CASCADE,

                    UNIQUE(
                        conversation_id,
                        phone_id
                    )
                )
        `
    }
];

function repairLegacyPhoneForeignKeys() {
    const repairs =
        PHONE_FOREIGN_KEY_REPAIRS
            .filter(
                repair =>
                    tableExists(
                        repair.table
                    )
                    &&
                    db.prepare(`
                        PRAGMA foreign_key_list(
                            ${repair.table}
                        )
                    `)
                        .all()
                        .some(
                            foreignKey =>
                                foreignKey.table ===
                                    "PhoneConversationsV2_Legacy"
                                ||
                                foreignKey.table ===
                                    "PhoneMessagesV2_Legacy"
                        )
            );

    if (repairs.length === 0) {
        return;
    }

    console.log(
        "🔧 Réparation des références du Téléphone V2..."
    );

    db.pragma(
        "foreign_keys = OFF"
    );
    db.pragma(
        "legacy_alter_table = ON"
    );

    const repairTransaction =
        db.transaction(
            () => {
                for (
                    const repair
                    of repairs
                ) {
                    const temporaryTable =
                        `${repair.table}_GreycoreRepair`;
                    const columns =
                        repair.columns
                            .join(", ");

                    db.prepare(`
                        ALTER TABLE ${repair.table}
                        RENAME TO ${temporaryTable}
                    `).run();

                    db.prepare(
                        repair.createSql
                    ).run();

                    db.prepare(`
                        INSERT INTO ${repair.table} (
                            ${columns}
                        )
                        SELECT
                            ${columns}
                        FROM ${temporaryTable}
                    `).run();

                    db.prepare(`
                        DROP TABLE ${temporaryTable}
                    `).run();
                }
            }
        );

    try {
        repairTransaction();

        console.log(
            "✅ Références du Téléphone V2 réparées."
        );
    } finally {
        db.pragma(
            "legacy_alter_table = OFF"
        );
        db.pragma(
            "foreign_keys = ON"
        );
    }
}

function initializeMediaSchemaV2() {
    /*
     * TÉLÉPHONES LIÉS AUX CONTINUITÉS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ContinuityPhonesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            continuity_id TEXT NOT NULL UNIQUE,

            phone_number TEXT NOT NULL UNIQUE,

            is_active INTEGER NOT NULL DEFAULT 1,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * MIGRATION ET CRÉATION
     * DES CONVERSATIONS ET SMS
     */
    migratePhoneSchema();

    /*
     * PARTICIPANTS DES CONVERSATIONS
     *
     * Un participant peut être :
     * - un téléphone Greycore ;
     * - un personnage externe ;
     * - un PNJ ;
     * - un personnage PluralKit/Tupperbox.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS
            PhoneConversationParticipantsV2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                conversation_id INTEGER NOT NULL,

                phone_id INTEGER,

                external_name TEXT,
                external_phone TEXT,

                participant_type TEXT
                    NOT NULL
                    DEFAULT 'greycore',

                is_admin INTEGER
                    NOT NULL
                    DEFAULT 0,

                has_left INTEGER
                    NOT NULL
                    DEFAULT 0,

                joined_at TEXT NOT NULL,
                left_at TEXT,

                FOREIGN KEY(conversation_id)
                    REFERENCES PhoneConversationsV2(id)
                    ON DELETE CASCADE,

                FOREIGN KEY(phone_id)
                    REFERENCES ContinuityPhonesV2(id)
                    ON DELETE CASCADE,

                CHECK (
                    participant_type IN (
                        'greycore',
                        'external',
                        'plural',
                        'tupperbox',
                        'npc'
                    )
                ),

                CHECK (
                    phone_id IS NOT NULL
                    OR external_name IS NOT NULL
                    OR external_phone IS NOT NULL
                )
            )
    `).run();

    /*
     * CONTACTS
     *
     * Chaque téléphone possède
     * son propre carnet d’adresses.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PhoneContactsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            phone_id INTEGER NOT NULL,

            linked_phone_id INTEGER,

            contact_type TEXT
                NOT NULL
                DEFAULT 'greycore',

            display_name TEXT NOT NULL,
            phone_number TEXT,

            favorite INTEGER
                NOT NULL
                DEFAULT 0,

            pinned INTEGER
                NOT NULL
                DEFAULT 0,

            blocked INTEGER
                NOT NULL
                DEFAULT 0,

            interaction_count INTEGER
                NOT NULL
                DEFAULT 0,

            last_interaction_at TEXT,

            notes TEXT,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(linked_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE SET NULL,

            CHECK (
                contact_type IN (
                    'greycore',
                    'external',
                    'plural',
                    'tupperbox',
                    'npc'
                )
            )
        )
    `).run();

    /*
     * MESSAGES LUS ET NON LUS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PhoneConversationReadsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_id INTEGER NOT NULL,
            phone_id INTEGER NOT NULL,

            last_read_message_id INTEGER,
            unread_count INTEGER
                NOT NULL
                DEFAULT 0,

            last_read_at TEXT,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(conversation_id)
                REFERENCES PhoneConversationsV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(last_read_message_id)
                REFERENCES PhoneMessagesV2(id)
                ON DELETE SET NULL,

            UNIQUE(
                conversation_id,
                phone_id
            )
        )
    `).run();

    /*
     * HISTORIQUE DES APPELS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PhoneCallHistoryV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_id INTEGER,

            caller_phone_id INTEGER,

            external_caller_name TEXT,
            external_caller_phone TEXT,

            call_type TEXT
                NOT NULL
                DEFAULT 'private',

            status TEXT
                NOT NULL
                DEFAULT 'started',

            started_at TEXT NOT NULL,
            answered_at TEXT,
            ended_at TEXT,

            created_at TEXT NOT NULL,

            FOREIGN KEY(conversation_id)
                REFERENCES PhoneConversationsV2(id)
                ON DELETE SET NULL,

            FOREIGN KEY(caller_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE SET NULL,

            CHECK (
                call_type IN (
                    'private',
                    'group'
                )
            ),

            CHECK (
                status IN (
                    'started',
                    'ringing',
                    'answered',
                    'missed',
                    'declined',
                    'cancelled',
                    'ended'
                )
            )
        )
    `).run();

    /*
     * PARAMÈTRES DES CONVERSATIONS
     *
     * Ils sont propres à chaque téléphone :
     * épinglée, favorite, silencieuse ou supprimée.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS
            PhoneConversationSettingsV2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                conversation_id INTEGER NOT NULL,
                phone_id INTEGER NOT NULL,

                is_favorite INTEGER
                    NOT NULL
                    DEFAULT 0,

                is_pinned INTEGER
                    NOT NULL
                    DEFAULT 0,

                is_muted INTEGER
                    NOT NULL
                    DEFAULT 0,

                is_hidden INTEGER
                    NOT NULL
                    DEFAULT 0,

                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY(conversation_id)
                    REFERENCES PhoneConversationsV2(id)
                    ON DELETE CASCADE,

                FOREIGN KEY(phone_id)
                    REFERENCES ContinuityPhonesV2(id)
                    ON DELETE CASCADE,

                UNIQUE(
                    conversation_id,
                    phone_id
                )
            )
    `).run();

    repairLegacyPhoneForeignKeys();

    /*
     * OUTFITS LIÉS AUX CONTINUITÉS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ContinuityOutfitsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            continuity_id TEXT NOT NULL,

            image_url TEXT NOT NULL,

            title TEXT,
            description TEXT,

            is_current INTEGER NOT NULL DEFAULT 1,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * TRANSFERT DES ANCIENNES CONVERSATIONS
     * DANS LA TABLE DES PARTICIPANTS
     */
    db.prepare(`
        INSERT OR IGNORE INTO
            PhoneConversationParticipantsV2 (
                conversation_id,
                phone_id,
                participant_type,
                is_admin,
                joined_at
            )
        SELECT
            conversation.id,
            conversation.phone_a_id,
            'greycore',
            1,
            conversation.created_at

        FROM PhoneConversationsV2 conversation

        WHERE conversation.phone_a_id IS NOT NULL

        AND NOT EXISTS (
            SELECT 1
            FROM PhoneConversationParticipantsV2 participant
            WHERE participant.conversation_id =
                conversation.id
            AND participant.phone_id =
                conversation.phone_a_id
        )
    `).run();

    db.prepare(`
        INSERT OR IGNORE INTO
            PhoneConversationParticipantsV2 (
                conversation_id,
                phone_id,
                participant_type,
                is_admin,
                joined_at
            )
        SELECT
            conversation.id,
            conversation.phone_b_id,
            'greycore',
            0,
            conversation.created_at

        FROM PhoneConversationsV2 conversation

        WHERE conversation.phone_b_id IS NOT NULL

        AND NOT EXISTS (
            SELECT 1
            FROM PhoneConversationParticipantsV2 participant
            WHERE participant.conversation_id =
                conversation.id
            AND participant.phone_id =
                conversation.phone_b_id
        )
    `).run();

    /*
     * INDEX
     */
    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phones_v2_continuity
        ON ContinuityPhonesV2(
            continuity_id
        )
    `).run();

    db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_phone_private_conversation_unique
        ON PhoneConversationsV2(
            phone_a_id,
            phone_b_id
        )
        WHERE conversation_type = 'private'
        AND phone_a_id IS NOT NULL
        AND phone_b_id IS NOT NULL
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_conversations_v2_phone_a
        ON PhoneConversationsV2(
            phone_a_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_conversations_v2_phone_b
        ON PhoneConversationsV2(
            phone_b_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_conversations_v2_updated
        ON PhoneConversationsV2(
            updated_at
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_participants_conversation
        ON PhoneConversationParticipantsV2(
            conversation_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_participants_phone
        ON PhoneConversationParticipantsV2(
            phone_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_contacts_owner
        ON PhoneContactsV2(
            phone_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_contacts_name
        ON PhoneContactsV2(
            display_name
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_contacts_number
        ON PhoneContactsV2(
            phone_number
        )
    `).run();

    db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_phone_contacts_linked_unique
        ON PhoneContactsV2(
            phone_id,
            linked_phone_id
        )
        WHERE linked_phone_id IS NOT NULL
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_messages_v2_conversation
        ON PhoneMessagesV2(
            conversation_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_messages_v2_created
        ON PhoneMessagesV2(
            created_at
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_reads_phone
        ON PhoneConversationReadsV2(
            phone_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_calls_conversation
        ON PhoneCallHistoryV2(
            conversation_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_calls_caller
        ON PhoneCallHistoryV2(
            caller_phone_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_outfits_v2_continuity
        ON ContinuityOutfitsV2(
            continuity_id
        )
    `).run();

    console.log(
        "✅ Tables Téléphone et Outfit de Greycore Database V2 prêtes."
    );
}

module.exports =
    initializeMediaSchemaV2;
