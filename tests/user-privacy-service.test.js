const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");

const {
    UserPrivacyRepository
} = require(
    "../src/v2/repositories/UserPrivacyRepository"
);

function createDatabase() {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE UsersV2 (
            id INTEGER PRIMARY KEY,
            discord_user_id TEXT UNIQUE
        );
        CREATE TABLE CharactersV2 (
            id TEXT PRIMARY KEY,
            owner_user_id INTEGER NOT NULL,
            FOREIGN KEY(owner_user_id)
                REFERENCES UsersV2(id)
                ON DELETE CASCADE
        );
        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT PRIMARY KEY,
            character_id TEXT NOT NULL,
            FOREIGN KEY(character_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE
        );
        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER PRIMARY KEY,
            character_id TEXT NOT NULL,
            validated_by TEXT,
            FOREIGN KEY(character_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE
        );
        CREATE TABLE Characters (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            validated_by TEXT
        );
        CREATE TABLE ProxyMessages (
            discord_message_id TEXT PRIMARY KEY,
            author_id TEXT NOT NULL,
            character_id TEXT NOT NULL
        );
        CREATE TABLE MigrationV1ToV2 (
            entity_type TEXT,
            old_id TEXT,
            new_id TEXT
        );
        CREATE TABLE StateTypes (
            id INTEGER PRIMARY KEY,
            created_by TEXT NOT NULL
        );
        CREATE TABLE GuildCharacterApprovalAutomationRunsV2 (
            guild_id TEXT,
            discord_user_id TEXT,
            PRIMARY KEY(guild_id, discord_user_id)
        );
    `);

    return db;
}

test(
    "l'oubli conserve les personnages et anonymise l'identite Discord",
    () => {
        const db = createDatabase();
        const service =
            new UserPrivacyRepository(
                db,
                () => "forgotten:test"
            );

        db.exec(`
            INSERT INTO UsersV2 VALUES (1, 'user-1');
            INSERT INTO CharactersV2 VALUES ('v2-character', 1);
            INSERT INTO CharacterContinuitiesV2 VALUES ('continuity', 'v2-character');
            INSERT INTO CharacterGuildInstallationsV2 VALUES (7, 'v2-character', NULL);
            INSERT INTO Characters VALUES ('v1-character', 'user-1', NULL);
            INSERT INTO ProxyMessages VALUES ('message', 'user-1', 'v2-character');
            INSERT INTO MigrationV1ToV2 VALUES ('character', 'old', 'v2-character');
            INSERT INTO MigrationV1ToV2 VALUES ('continuity', 'old-c', 'continuity');
            INSERT INTO MigrationV1ToV2 VALUES ('installation', 'old-i', '7');
            INSERT INTO StateTypes VALUES (1, 'user-1');
            INSERT INTO GuildCharacterApprovalAutomationRunsV2 VALUES ('guild', 'user-1');
        `);

        const before =
            service.getSummary("user-1");

        assert.equal(before.globalCharacters, 1);
        assert.equal(before.legacyCharacters, 1);
        assert.equal(before.proxyMessages, 1);

        const erased = service.erase("user-1");

        assert.equal(erased.globalCharacters, 1);
        assert.equal(
            db.prepare("SELECT COUNT(*) AS total FROM UsersV2").get().total,
            1
        );
        assert.equal(
            db.prepare("SELECT COUNT(*) AS total FROM Characters").get().total,
            1
        );
        assert.equal(
            db.prepare("SELECT COUNT(*) AS total FROM ProxyMessages").get().total,
            1
        );
        assert.equal(
            db.prepare("SELECT COUNT(*) AS total FROM MigrationV1ToV2").get().total,
            3
        );
        assert.equal(
            db.prepare("SELECT discord_user_id FROM UsersV2").get().discord_user_id,
            "forgotten:test"
        );
        assert.equal(
            db.prepare("SELECT owner_id FROM Characters").get().owner_id,
            "forgotten:test"
        );
        assert.equal(
            db.prepare("SELECT author_id FROM ProxyMessages").get().author_id,
            "forgotten:test"
        );
        assert.equal(
            db.prepare("SELECT created_by FROM StateTypes WHERE id = 1").get().created_by,
            "forgotten:test"
        );
        assert.equal(
            db.prepare("SELECT COUNT(*) AS total FROM GuildCharacterApprovalAutomationRunsV2").get().total,
            0
        );
        assert.equal(
            service.getSummary("user-1").globalCharacters,
            0
        );
    }
);

test(
    "une demande d'oubli sans donnees reste sans effet et sans erreur",
    () => {
        const db = createDatabase();
        const service =
            new UserPrivacyRepository(db);

        const erased = service.erase("unknown");

        assert.equal(erased.globalCharacters, 0);
        assert.equal(erased.legacyCharacters, 0);
    }
);
