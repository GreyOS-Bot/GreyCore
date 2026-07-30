const db =
    require("./database");
const initializeProfileSchemaV2 =
    require("./schemaV2Profile");  
const initializeRoleplaySchemaV2 =
    require("./schemaV2Roleplay"); 
const initializeMediaSchemaV2 =
    require("./schemaV2Media");
const initializeInstallationSchemaV2 =
    require("./schemaV2Installation");
const initializeAssetSchemaV2 =
    require("./schemaV2Assets");
const initializeAutomationSchemaV2 =
    require("./schemaV2Automation");
const initializeSceneAssistantSchemaV2 =
    require("./schemaV2SceneAssistant");

function columnExists(
    tableName,
    columnName
) {
    return db.prepare(`
        PRAGMA table_info(${tableName})
    `).all().some(
        column =>
            column.name === columnName
    );
}

function initializeSchemaV2() {
    /*
     * UTILISATEURS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS UsersV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            discord_user_id TEXT NOT NULL UNIQUE,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `).run();

    /*
     * PERSONNAGES GLOBAUX
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharactersV2 (
            id TEXT PRIMARY KEY,

            owner_user_id INTEGER NOT NULL,

            proxy_name TEXT NOT NULL,

            avatar_url TEXT,

            base_firstname TEXT,
            base_lastname TEXT,

            character_type TEXT NOT NULL
                DEFAULT 'personnage_joue',

            is_archived INTEGER NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(owner_user_id)
                REFERENCES UsersV2(id)
                ON DELETE CASCADE,

            UNIQUE(owner_user_id, proxy_name)
        )
    `).run();

    if (
        !columnExists(
            "CharactersV2",
            "character_type"
        )
    ) {
        db.prepare(`
            ALTER TABLE CharactersV2
            ADD COLUMN character_type TEXT
            NOT NULL DEFAULT 'personnage_joue'
        `).run();
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharacterAliasesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            character_id TEXT NOT NULL,

            alias TEXT NOT NULL,

            created_at TEXT NOT NULL,

            FOREIGN KEY(character_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,

            UNIQUE(character_id, alias)
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_character_aliases_v2_character
        ON CharacterAliasesV2(character_id)
    `).run();

    /*
     * CONTINUITÉS RP
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharacterContinuitiesV2 (
            id TEXT PRIMARY KEY,

            character_id TEXT NOT NULL,

            name TEXT NOT NULL,

            mode TEXT NOT NULL DEFAULT 'original',

            source_continuity_id TEXT,

            firstname TEXT,
            lastname TEXT,

            age INTEGER,

            gang TEXT,

            story TEXT,

            is_archived INTEGER NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(character_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(source_continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE SET NULL,

            UNIQUE(character_id, name)
        )
    `).run();

    /*
     * INSTALLATIONS SUR LES SERVEURS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharacterGuildInstallationsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            character_id TEXT NOT NULL,

            continuity_id TEXT NOT NULL,

            guild_id TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'draft',

            visibility TEXT NOT NULL DEFAULT 'private',

            proxy_enabled INTEGER NOT NULL DEFAULT 0,

            validated_by TEXT,

            validated_at TEXT,

            rejection_reason TEXT,

            installed_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            last_activity_at TEXT,

            FOREIGN KEY(character_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE,

            UNIQUE(continuity_id, guild_id)
        )
    `).run();

    /*
     * CORRESPONDANCES ENTRE LA V1 ET LA V2
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS MigrationV1ToV2 (
            entity_type TEXT NOT NULL,

            old_id TEXT NOT NULL,

            new_id TEXT NOT NULL,

            migrated_at TEXT NOT NULL,

            PRIMARY KEY(entity_type, old_id)
        )
    `).run();

    /*
     * INDEX
     */
    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_users_v2_discord_user
        ON UsersV2(discord_user_id)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_characters_v2_owner
        ON CharactersV2(owner_user_id)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_continuities_v2_character
        ON CharacterContinuitiesV2(character_id)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_installations_v2_character
        ON CharacterGuildInstallationsV2(character_id)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_installations_v2_continuity
        ON CharacterGuildInstallationsV2(continuity_id)
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_installations_v2_guild
        ON CharacterGuildInstallationsV2(guild_id)
    `).run();

    initializeProfileSchemaV2();
    initializeMediaSchemaV2();
    initializeRoleplaySchemaV2();
    initializeInstallationSchemaV2();
    initializeAssetSchemaV2();
    initializeAutomationSchemaV2();
    initializeSceneAssistantSchemaV2();

    console.log(
        "✅ Tables principales de Greycore Database V2 prêtes."
    );
}

module.exports = initializeSchemaV2;

