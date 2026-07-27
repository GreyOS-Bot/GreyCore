const db = require("./database");
const initializeSchemaV2 =
    require("./schemaV2");

function initializeDatabase() {
    console.log("🗄️ Vérification de la base de données...");

    db.prepare(`
        CREATE TABLE IF NOT EXISTS Guilds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS Characters (
            id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT,
            color TEXT DEFAULT '#2B2D31',
            visibility TEXT NOT NULL DEFAULT 'private',
            type TEXT NOT NULL DEFAULT 'personnage_joue',
            status TEXT NOT NULL DEFAULT 'pending',
            validated_by TEXT,
            validated_at TEXT,
            rejection_reason TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            UNIQUE(guild_id, name),

            FOREIGN KEY (guild_id) REFERENCES Guilds(id)
        )
    `).run();

    const characterColumns = db.prepare(`PRAGMA table_info(Characters)`).all();

    const hasVisibilityColumn = characterColumns.some(column => column.name === "visibility");
    const hasTypeColumn = characterColumns.some(column => column.name === "type");
    const hasStatusColumn = characterColumns.some(column => column.name === "status");
    const hasValidatedByColumn = characterColumns.some(
    column => column.name === "validated_by"
);

const hasValidatedAtColumn = characterColumns.some(
    column => column.name === "validated_at"
);

const hasRejectionReasonColumn = characterColumns.some(
    column => column.name === "rejection_reason"
);

    if (!hasRejectionReasonColumn) {
    db.prepare(`
        ALTER TABLE Characters
        ADD COLUMN rejection_reason TEXT
    `).run();
}

    if (!hasVisibilityColumn) {
        db.prepare(`
            ALTER TABLE Characters
            ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
        `).run();
    }

    if (!hasValidatedByColumn) {
    db.prepare(`
        ALTER TABLE Characters
        ADD COLUMN validated_by TEXT
    `).run();
}

if (!hasValidatedAtColumn) {
    db.prepare(`
        ALTER TABLE Characters
        ADD COLUMN validated_at TEXT
    `).run();
}

    if (!hasStatusColumn) {
    db.prepare(`
        ALTER TABLE Characters
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
    `).run();
}

    if (!hasTypeColumn) {
        db.prepare(`
            ALTER TABLE Characters
            ADD COLUMN type TEXT NOT NULL DEFAULT 'personnage_joue'
        `).run();
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharacterProfiles (
            character_id TEXT PRIMARY KEY,
            lastname TEXT,
            firstname TEXT,
            age INTEGER,
            gang TEXT,
            story TEXT,
            updated_at TEXT,
            FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
    CREATE TABLE IF NOT EXISTS ProxyMessages (
        discord_message_id TEXT PRIMARY KEY,
        webhook_message_id TEXT NOT NULL,
        webhook_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        character_version TEXT NOT NULL
            DEFAULT 'v1'
            CHECK (
                character_version IN ('v1', 'v2')
            ),
        created_at TEXT NOT NULL
    )
`).run();

    migrateProxyMessagesToVersionedCharacters();

db.prepare(`
    CREATE TABLE IF NOT EXISTS CharacterAliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        created_at TEXT NOT NULL,

        UNIQUE(alias),

        FOREIGN KEY(character_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS RelationshipTypes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        key TEXT NOT NULL,
        label_a_to_b TEXT NOT NULL,
        label_b_to_a TEXT NOT NULL,
        is_symmetric INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,

        UNIQUE(guild_id, key),

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS CharacterRelationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        character_a_id TEXT NOT NULL,
        character_b_id TEXT NOT NULL,
        relationship_type_id INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,

        UNIQUE(
            guild_id,
            character_a_id,
            character_b_id,
            relationship_type_id
        ),

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE,

        FOREIGN KEY(character_a_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE,

        FOREIGN KEY(character_b_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE,

        FOREIGN KEY(relationship_type_id)
            REFERENCES RelationshipTypes(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS GuildSettings (
        guild_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        updated_at TEXT NOT NULL,

        PRIMARY KEY (guild_id, setting_key),

        FOREIGN KEY (guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS StateTypes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT,
        color TEXT DEFAULT '#2B2D31',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,

        UNIQUE(guild_id, name),

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS CharacterStates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        state_type_id INTEGER NOT NULL,
        note TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE,

        FOREIGN KEY(character_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE,

        FOREIGN KEY(state_type_id)
            REFERENCES StateTypes(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS CharacterOutfits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        character_id TEXT NOT NULL,

        image_url TEXT NOT NULL,

        title TEXT,

        description TEXT,

        is_current INTEGER NOT NULL DEFAULT 1,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL,

        FOREIGN KEY(character_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE
    )
`).run();

console.log("✅ Table CharacterOutfits prête.");

    db.prepare(`
    CREATE TABLE IF NOT EXISTS CharacterEncounters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        character_a_id TEXT NOT NULL,
        character_b_id TEXT,
        external_name TEXT,
        occurred_at TEXT NOT NULL,
        location TEXT,
        note TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE,

        FOREIGN KEY(character_a_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE,

        FOREIGN KEY(character_b_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE
    )
`).run();

const encounterColumns = db.prepare(`
    PRAGMA table_info(CharacterEncounters)
`).all();

const encounterCharacterBColumn =
    encounterColumns.find(column => column.name === "character_b_id");

const hasExternalNameColumn =
    encounterColumns.some(column => column.name === "external_name");

const encounterNeedsMigration =
    encounterCharacterBColumn?.notnull === 1 ||
    !hasExternalNameColumn;

if (encounterNeedsMigration) {
    console.log("🔄 Migration de la table CharacterEncounters...");

    db.prepare(`
        CREATE TABLE CharacterEncounters_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            character_a_id TEXT NOT NULL,
            character_b_id TEXT,
            external_name TEXT,
            occurred_at TEXT NOT NULL,
            location TEXT,
            note TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE,

            FOREIGN KEY(character_a_id)
                REFERENCES Characters(id)
                ON DELETE CASCADE,

            FOREIGN KEY(character_b_id)
                REFERENCES Characters(id)
                ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        INSERT INTO CharacterEncounters_new (
            id,
            guild_id,
            character_a_id,
            character_b_id,
            external_name,
            occurred_at,
            location,
            note,
            created_by,
            created_at,
            updated_at
        )
        SELECT
            id,
            guild_id,
            character_a_id,
            character_b_id,
            NULL,
            occurred_at,
            location,
            note,
            created_by,
            created_at,
            updated_at
        FROM CharacterEncounters
    `).run();

    db.prepare(`
        DROP TABLE CharacterEncounters
    `).run();

    db.prepare(`
        ALTER TABLE CharacterEncounters_new
        RENAME TO CharacterEncounters
    `).run();

    console.log("✅ Migration CharacterEncounters terminée.");
}

db.prepare(`
    CREATE TABLE IF NOT EXISTS Phones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        UNIQUE(character_id),
        UNIQUE(guild_id, phone_number),

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE,

        FOREIGN KEY(character_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS PhoneConversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        phone_a_id INTEGER NOT NULL,
        phone_b_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        UNIQUE(guild_id, phone_a_id, phone_b_id),

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE,

        FOREIGN KEY(phone_a_id)
            REFERENCES Phones(id)
            ON DELETE CASCADE,

        FOREIGN KEY(phone_b_id)
            REFERENCES Phones(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS PhoneMessages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_phone_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        public_channel_id TEXT,
        webhook_message_id TEXT,
        created_at TEXT NOT NULL,

        FOREIGN KEY(conversation_id)
            REFERENCES PhoneConversations(id)
            ON DELETE CASCADE,

        FOREIGN KEY(sender_phone_id)
            REFERENCES Phones(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS CharacterInstallationMessages (
        character_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY(character_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE,

        FOREIGN KEY(guild_id)
            REFERENCES Guilds(id)
            ON DELETE CASCADE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS PendingRelationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        guild_id TEXT NOT NULL,

        requester_character_id TEXT NOT NULL,
        target_character_id TEXT NOT NULL,

        relationship_type_id INTEGER NOT NULL,

        requested_by TEXT NOT NULL,
        target_owner_id TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'pending',

        created_at TEXT NOT NULL,
        responded_at TEXT,
        responded_by TEXT,

        FOREIGN KEY(requester_character_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE,

        FOREIGN KEY(target_character_id)
            REFERENCES Characters(id)
            ON DELETE CASCADE,

        FOREIGN KEY(relationship_type_id)
            REFERENCES RelationshipTypes(id)
            ON DELETE CASCADE
    )
`).run();

initializeSchemaV2();

const existingTables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name ASC
`).all();

console.log(
    "🧪 Tables réellement présentes :",
    existingTables.map(table => table.name)
);

    console.log("✅ Table Guilds prête.");
    console.log("✅ Table Characters prête.");
    console.log("✅ Table CharacterProfiles prête.");
    console.log("✅ Base de données prête.");
    console.log("✅ Table ProxyMessages prête.");
    console.log("✅ Table CharacterAliases prête.");
    console.log("✅ Table RelationshipTypes prête.");
    console.log("✅ Table CharacterRelationships prête.");
    console.log("✅ Table GuildSettings prête.");
    console.log("✅ Table CharacterEncounters prête.");
    console.log("✅ Table StateTypes prête.");
    console.log("✅ Table CharacterStates prête.");
    console.log("✅ Table Phones prête.");
    console.log("✅ Table CharacterInstallationMessages prête.");
    console.log("✅ Table PhoneConversations prête.");
    console.log("✅ Table PhoneMessages prête.");
    console.log("✅ Table PendingRelationships prête.");

}

function migrateProxyMessagesToVersionedCharacters() {
    const columns =
        db.prepare(`
            PRAGMA table_info(ProxyMessages)
        `).all();

    if (
        columns.some(
            column =>
                column.name ===
                "character_version"
        )
    ) {
        return;
    }

    const migrate =
        db.transaction(() => {
            db.prepare(`
                ALTER TABLE ProxyMessages
                RENAME TO ProxyMessages_legacy
            `).run();

            db.prepare(`
                CREATE TABLE ProxyMessages (
                    discord_message_id TEXT PRIMARY KEY,
                    webhook_message_id TEXT NOT NULL,
                    webhook_id TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    guild_id TEXT NOT NULL,
                    author_id TEXT NOT NULL,
                    character_id TEXT NOT NULL,
                    character_version TEXT NOT NULL
                        DEFAULT 'v1'
                        CHECK (
                            character_version
                            IN ('v1', 'v2')
                        ),
                    created_at TEXT NOT NULL
                )
            `).run();

            db.prepare(`
                INSERT INTO ProxyMessages (
                    discord_message_id,
                    webhook_message_id,
                    webhook_id,
                    channel_id,
                    guild_id,
                    author_id,
                    character_id,
                    character_version,
                    created_at
                )
                SELECT
                    discord_message_id,
                    webhook_message_id,
                    webhook_id,
                    channel_id,
                    guild_id,
                    author_id,
                    character_id,
                    'v1',
                    created_at
                FROM ProxyMessages_legacy
            `).run();

            db.prepare(`
                DROP TABLE ProxyMessages_legacy
            `).run();
        });

    migrate();
}

module.exports = {
    initializeDatabase
};
