const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

test("3C backfill is additive, stable and only creates defaults for installed Guilds", () => {
    const isolated = createIsolatedDatabase();
    try {
        const db = isolated.database;
        db.exec(`
            PRAGMA foreign_keys = ON;
            CREATE TABLE Guilds(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE CharactersV2(id TEXT PRIMARY KEY);
            CREATE TABLE CharacterContinuitiesV2(id TEXT PRIMARY KEY, character_id TEXT NOT NULL);
            CREATE TABLE CharacterGuildInstallationsV2(
                id INTEGER PRIMARY KEY AUTOINCREMENT, character_id TEXT NOT NULL,
                continuity_id TEXT NOT NULL, guild_id TEXT NOT NULL,
                status TEXT NOT NULL, visibility TEXT NOT NULL, proxy_enabled INTEGER NOT NULL,
                local_avatar_url TEXT, validated_by TEXT, validated_at TEXT,
                rejection_reason TEXT, installed_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                last_activity_at TEXT, UNIQUE(continuity_id, guild_id)
            );
            INSERT INTO Guilds VALUES ('g1','One','now'),('g2','Two','now');
            INSERT INTO CharactersV2 VALUES ('c1');
            INSERT INTO CharacterContinuitiesV2 VALUES ('k1','c1');
            INSERT INTO CharacterGuildInstallationsV2 VALUES
                (41,'c1','k1','g1','approved','public',1,'avatar','staff','then',NULL,'then','then','then');
        `);
        const migrate = require("../src/v2/repositories/InstallationContextMigration");
        migrate(db);
        const first = db.prepare("SELECT * FROM CharacterGuildInstallationsV2").get();
        const contextCount = db.prepare("SELECT COUNT(*) value FROM Contexts").get().value;
        migrate(db);
        const second = db.prepare("SELECT * FROM CharacterGuildInstallationsV2").get();
        assert.equal(first.id, 41);
        assert.equal(first.context_id, second.context_id);
        assert.equal(db.prepare("SELECT COUNT(*) value FROM CharacterGuildInstallationsV2").get().value, 1);
        assert.equal(db.prepare("SELECT COUNT(*) value FROM Contexts").get().value, contextCount);
        assert.equal(db.prepare("SELECT COUNT(*) value FROM Contexts WHERE guild_id = 'g2'").get().value, 0);
        assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
    } finally { isolated.cleanup(); }
});

test("3C resolves exact active Contexts, isolates rosters and keeps the Context immutable", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        const db = isolated.database;
        db.prepare("INSERT INTO Guilds VALUES ('g','Guild','now')").run();
        db.prepare("INSERT INTO UsersV2(discord_user_id,created_at,updated_at) VALUES ('u','now','now')").run();
        db.prepare("INSERT INTO CharactersV2(id,owner_user_id,proxy_name,character_type,created_at,updated_at) VALUES ('c',1,'Hero','personnage_joue','now','now')").run();
        db.prepare("INSERT INTO CharacterContinuitiesV2(id,character_id,name,created_at,updated_at) VALUES ('a','c','A','now','now'),('b','c','B','now','now')").run();
        const ContextRepository = require("../src/v2/repositories/ContextRepository");
        const ContextService = require("../src/v2/services/contexts/ContextService");
        const contexts = new ContextService(new ContextRepository(db));
        const a = contexts.create({ guildId: "g", key: "a", name: "A" });
        const b = contexts.create({ guildId: "g", key: "b", name: "B", parentContextId: a.id });
        const managerPath = require.resolve("../src/v2/managers/InstallationV2Manager");
        const repoPath = require.resolve("../src/v2/repositories/InstallationRepository");
        delete require.cache[managerPath]; delete require.cache[repoPath];
        const manager = require("../src/v2/managers/InstallationV2Manager");
        const ia = manager.createDraft({ continuityId: "a", guildId: "g" });
        const ib = manager.createDraft({ continuityId: "b", guildId: "g", contextId: b.id });
        manager.updateStatus(ia.id, { status: "approved", proxyEnabled: true });
        manager.updateStatus(ib.id, { status: "approved", proxyEnabled: true });
        contexts.setDefault("g", b.id);
        assert.equal(manager.getById(ia.id).context_id, a.id);
        assert.deepEqual(manager.getPlayableCharactersForGuildAndContext("g", a.id).map(x => x.installation_id), [ia.id]);
        assert.deepEqual(manager.getPlayableCharactersForGuildAndContext("g", b.id).map(x => x.installation_id), [ib.id]);
        assert.throws(() => manager.requireInContext(ia.id, "g", b.id), /introuvable dans ce Context/);
        assert.throws(() => db.prepare("UPDATE CharacterGuildInstallationsV2 SET context_id = ? WHERE id = ?").run(b.id, ia.id), /immutable/);
        assert.throws(() => manager.createDraft({ continuityId: "a", guildId: "g", contextId: b.id }), /déjà|already|UNIQUE/i);
        assert.equal(manager.getByGuildAndContext("g", b.id).length, 1);
        assert.equal(manager.requireInstallationInSceneContext(ia.id, { guild_id: "g", context_id: a.id }).id, ia.id);
        assert.throws(() => manager.requireInstallationInSceneContext(ia.id, { guild_id: "g", context_id: b.id }), /introuvable/);
        assert.equal(manager.requireInstallationForGreyFate(ib.id,
            { guild_id: "g", context_id: b.id }, { guild_id: "g", context_id: b.id }).id, ib.id);
        assert.throws(() => manager.requireInstallationForGreyFate(ia.id,
            { guild_id: "g", context_id: a.id }, { guild_id: "g", context_id: b.id }), /différents/);
        const resolvedA = require("../src/services/proxy/ProxyCharacterResolver").resolveProxyCharacter({
            discordUserId: "u", guildId: "g", proxyName: "Hero", contextId: a.id
        });
        const resolvedB = require("../src/services/proxy/ProxyCharacterResolver").resolveProxyCharacter({
            discordUserId: "u", guildId: "g", proxyName: "Hero", contextId: b.id
        });
        assert.equal(resolvedA.v2Installation.installation_id, ia.id);
        assert.equal(resolvedB.v2Installation.installation_id, ib.id);
        const resolvedDefault = require("../src/services/proxy/ProxyCharacterResolver").resolveProxyCharacter({
            discordUserId: "u", guildId: "g", proxyName: "Hero"
        });
        assert.equal(resolvedDefault.v2Installation.installation_id, ib.id);
        db.prepare("UPDATE Contexts SET is_default=0 WHERE id=?").run(a.id);
        db.prepare("UPDATE Contexts SET is_active=0 WHERE id=?").run(a.id);
        assert.equal(manager.getById(ia.id).context_id, a.id);
        assert.throws(() => manager.getPlayableCharactersForGuildAndContext("g", a.id), /inactif/);
        assert.deepEqual(manager.getPlayableCharactersForGuildAndContext("g", b.id).map(x => x.installation_id), [ib.id]);
    } finally { isolated.cleanup(); }
});

test("3C rejects missing, cross-Guild and inactive explicit Contexts", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        const db = isolated.database;
        db.prepare("INSERT INTO Guilds VALUES ('g1','One','now'),('g2','Two','now')").run();
        db.prepare("INSERT INTO UsersV2(discord_user_id,created_at,updated_at) VALUES ('u','now','now')").run();
        db.prepare("INSERT INTO CharactersV2(id,owner_user_id,proxy_name,created_at,updated_at) VALUES ('c',1,'Hero','now','now')").run();
        db.prepare("INSERT INTO CharacterContinuitiesV2(id,character_id,name,created_at,updated_at) VALUES ('k','c','K','now','now')").run();
        const ContextRepository = require("../src/v2/repositories/ContextRepository");
        const ContextService = require("../src/v2/services/contexts/ContextService");
        const c1 = new ContextService(new ContextRepository(db));
        const other = c1.create({ guildId: "g2", key: "other", name: "Other" });
        db.prepare("UPDATE Contexts SET is_active=0,is_default=0 WHERE id=?").run(other.id);
        const managerPath = require.resolve("../src/v2/managers/InstallationV2Manager");
        const repoPath = require.resolve("../src/v2/repositories/InstallationRepository");
        delete require.cache[managerPath]; delete require.cache[repoPath];
        const manager = require("../src/v2/managers/InstallationV2Manager");
        assert.throws(() => manager.createDraft({ continuityId: "k", guildId: "g1", contextId: "missing" }), /introuvable/);
        assert.throws(() => manager.createDraft({ continuityId: "k", guildId: "g1", contextId: other.id }), /introuvable/);
        assert.throws(() => manager.createDraft({ continuityId: "k", guildId: "g2", contextId: other.id }), /inactif/);
    } finally { isolated.cleanup(); }
});
