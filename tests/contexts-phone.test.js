const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

function reload(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(modulePath);
}

function seedBase(db) {
    db.prepare("INSERT INTO Guilds(id,name,created_at) VALUES ('ga','A','now'),('gb','B','now')").run();
    db.prepare("INSERT INTO UsersV2(discord_user_id,created_at,updated_at) VALUES ('u','now','now')").run();
    db.prepare(`INSERT INTO CharactersV2(id,owner_user_id,proxy_name,character_type,created_at,updated_at)
        VALUES ('character',1,'Hero','personnage_joue','now','now')`).run();
}

function addContinuity(db, id) {
    db.prepare(`INSERT INTO CharacterContinuitiesV2(id,character_id,name,created_at,updated_at)
        VALUES (?,'character',?,'now','now')`).run(id, id);
}

function addInstallation(db, continuityId, guildId, contextId) {
    return Number(db.prepare(`INSERT INTO CharacterGuildInstallationsV2(
        character_id,continuity_id,guild_id,status,visibility,proxy_enabled,
        installed_at,updated_at,context_id
    ) VALUES ('character',?,?,'approved','public',1,'now','now',?)`).run(
        continuityId, guildId, contextId
    ).lastInsertRowid);
}

test("3D preserves 35 legacy phones and provisions one isolated instance per installation", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        const db = isolated.database;
        seedBase(db);
        const ContextRepository = reload("../src/v2/repositories/ContextRepository");
        const ContextService = reload("../src/v2/services/contexts/ContextService");
        const contexts = new ContextService(new ContextRepository(db));
        const ca = contexts.create({ guildId: "ga", key: "a", name: "A" });
        const cb = contexts.create({ guildId: "gb", key: "b", name: "B" });
        for (let index = 1; index <= 35; index++) {
            const continuityId = `k${index}`;
            addContinuity(db, continuityId);
            db.prepare(`INSERT INTO ContinuityPhonesV2(
                id,continuity_id,phone_number,is_active,created_at,updated_at
            ) VALUES (?,?,?,1,'then','then')`).run(index, continuityId, `555-${String(index).padStart(4, "0")}`);
            addInstallation(db, continuityId, "ga", ca.id);
            if (index <= 9) addInstallation(db, continuityId, "gb", cb.id);
        }
        const migrate = reload("../src/v2/repositories/InstallationPhoneSchema");
        migrate(db);
        const firstCount = db.prepare("SELECT COUNT(*) n FROM InstallationPhonesV2").get().n;
        migrate(db);
        assert.equal(db.prepare("SELECT COUNT(*) n FROM ContinuityPhonesV2").get().n, 35);
        assert.equal(firstCount, 44);
        assert.equal(db.prepare("SELECT COUNT(*) n FROM InstallationPhonesV2").get().n, 44);
        assert.equal(db.prepare("SELECT COUNT(*) n FROM InstallationPhoneLegacyArchiveV2 WHERE reason='multiple-installations'").get().n, 9);
        assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
    } finally { isolated.cleanup(); }
});

test("3D isolates contacts, conversations, messages and calls by exact Context", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        const db = isolated.database;
        seedBase(db);
        addContinuity(db, "ka"); addContinuity(db, "kb"); addContinuity(db, "kc"); addContinuity(db, "kd");
        const ContextRepository = reload("../src/v2/repositories/ContextRepository");
        const ContextService = reload("../src/v2/services/contexts/ContextService");
        const contexts = new ContextService(new ContextRepository(db));
        const ca = contexts.create({ guildId: "ga", key: "a", name: "A" });
        const child = contexts.create({ guildId: "ga", key: "child", name: "Child", parentContextId: ca.id });
        const cb = contexts.create({ guildId: "gb", key: "b", name: "B" });
        const ia = addInstallation(db, "ka", "ga", ca.id);
        const ia2 = addInstallation(db, "kb", "ga", ca.id);
        const duplicateInstallation = addInstallation(db, "kd", "ga", ca.id);
        const ichild = addInstallation(db, "kc", "ga", child.id);
        const ib = addInstallation(db, "kc", "gb", cb.id);
        reload("../src/v2/repositories/InstallationPhoneSchema")(db);
        const phoneRepository = reload("../src/v2/repositories/InstallationPhoneRepository");
        const phoneManager = reload("../src/v2/managers/InstallationPhoneV2Manager");
        const runtime = reload("../src/v2/services/phone/InstallationPhoneRuntimeService");
        const pa = phoneManager.createForInstallation(ia, { phoneNumber: "555-1000" });
        const pa2 = phoneManager.createForInstallation(ia2, { phoneNumber: "555-2000" });
        const pc = phoneManager.createForInstallation(ichild, { phoneNumber: "555-3000" });
        const pb = phoneManager.createForInstallation(ib, { phoneNumber: "555-1000" });
        assert.throws(() => phoneManager.createForInstallation(duplicateInstallation,
            { phoneNumber: "555-1000" }), /déjà utilisé/);
        assert.equal(phoneRepository.getByNumberInContext("ga", ca.id, "555-1000").id, pa.id);
        assert.equal(phoneRepository.getByNumberInContext("gb", cb.id, "555-1000").id, pb.id);
        assert.throws(() => runtime.createCall({ guildId: "ga", contextId: ca.id,
            callerPhoneId: pa.id, receiverPhoneId: pb.id }), /Context/);
        const contact = runtime.addContact({ guildId: "ga", contextId: ca.id,
            phoneId: pa.id, linkedPhoneId: pa2.id, displayName: "B" });
        assert.equal(runtime.listContacts({ guildId: "ga", contextId: ca.id, phoneId: pa.id }).length, 1);
        assert.throws(() => runtime.addContact({ guildId: "ga", contextId: ca.id,
            phoneId: pa.id, linkedPhoneId: pc.id, displayName: "forged" }), /Context/);
        assert.throws(() => runtime.removeContact({ guildId: "ga", contextId: ca.id,
            phoneId: pa2.id, contactId: contact.id }), /introuvable/);
        const conversation = runtime.getOrCreatePrivateConversation({ guildId: "ga", contextId: ca.id,
            phoneAId: pa.id, phoneBId: pa2.id, createdAt: "2026-01-01T00:00:00.000Z" });
        runtime.sendMessage({ guildId: "ga", contextId: ca.id, phoneId: pa.id,
            conversationId: conversation.id, content: "hello" });
        assert.equal(runtime.listMessages({ guildId: "ga", contextId: ca.id,
            phoneId: pa2.id, conversationId: conversation.id }).length, 1);
        assert.throws(() => runtime.listMessages({ guildId: "ga", contextId: child.id,
            phoneId: pc.id, conversationId: conversation.id }), /Context/);
        assert.throws(() => db.prepare(`INSERT INTO InstallationPhoneConversationParticipantsV2(
            conversation_id,phone_id,participant_type,joined_at) VALUES (?,?,'greycore','now')`)
            .run(conversation.id, pc.id), /scope mismatch/);
        assert.throws(() => db.prepare(`INSERT INTO InstallationPhoneMessagesV2(
            conversation_id,sender_phone_id,content,created_at) VALUES (?,?,?,'now')`)
            .run(conversation.id, pc.id, "forged"), /scope mismatch/);
        const call = runtime.createCall({ guildId: "ga", contextId: ca.id,
            callerPhoneId: pa.id, receiverPhoneId: pa2.id, createdAt: "2026-01-01T00:00:00.000Z" });
        assert.throws(() => runtime.transitionCall({ guildId: "ga", contextId: ca.id,
            phoneId: pa.id, callId: call.id, action: "accept" }), /participant/);
        assert.equal(runtime.transitionCall({ guildId: "ga", contextId: ca.id,
            phoneId: pa2.id, callId: call.id, action: "accept" }).status, "accepted");
        assert.throws(() => runtime.requireCallParticipant({ guildId: "ga", contextId: child.id,
            phoneId: pc.id, callId: call.id }), /Context/);
        assert.throws(() => db.prepare(`INSERT INTO InstallationPhoneCallsV2(
            guild_id,context_id,caller_phone_id,receiver_phone_id,status,created_at)
            VALUES ('ga',?,?,?,'ringing','now')`).run(ca.id, pa.id, pc.id), /scope mismatch/);
        const guardedCall = runtime.createCall({ guildId: "ga", contextId: ca.id,
            callerPhoneId: pa.id, receiverPhoneId: pa2.id });
        const facade = reload("../src/v2/managers/PhoneV2Manager");
        assert.throws(() => facade.acceptCall(guardedCall.id, pa.id), /participant/);
        assert.equal(facade.acceptCall(guardedCall.id, pa2.id).status, "accepted");
        contexts.setDefault("ga", child.id);
        assert.equal(runtime.listCallHistory({ guildId: "ga", contextId: ca.id, phoneId: pa.id }).length, 2);
        assert.equal(runtime.listCallHistory({ guildId: "ga", contextId: child.id, phoneId: pc.id }).length, 0);
        db.prepare("UPDATE Contexts SET is_active=0,is_default=0 WHERE id=?").run(ca.id);
        assert.equal(runtime.listCallHistory({ guildId: "ga", contextId: ca.id, phoneId: pa.id }).length, 2);
        assert.throws(() => runtime.addContact({ guildId: "ga", contextId: ca.id,
            phoneId: pa.id, displayName: "inactive" }), /inactif/);
        const numberPlan = db.prepare(`EXPLAIN QUERY PLAN SELECT * FROM InstallationPhonesV2
            WHERE guild_id=? AND context_id=? AND phone_number=?`).all("ga", ca.id, "555-1000")
            .map(row => row.detail).join(" ");
        const callPlan = db.prepare(`EXPLAIN QUERY PLAN SELECT * FROM InstallationPhoneCallsV2
            WHERE guild_id=? AND context_id=? AND status=? ORDER BY created_at`).all("ga", ca.id, "ringing")
            .map(row => row.detail).join(" ");
        assert.match(numberPlan, /INDEX/);
        assert.match(callPlan, /idx_installation_phone_calls_scope_status/);
        assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
    } finally { isolated.cleanup(); }
});

test("3D migrates only deterministic legacy history without changing legacy rows", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        const db = isolated.database;
        seedBase(db); addContinuity(db, "ka"); addContinuity(db, "kb");
        const ContextRepository = reload("../src/v2/repositories/ContextRepository");
        const ContextService = reload("../src/v2/services/contexts/ContextService");
        const context = new ContextService(new ContextRepository(db))
            .create({ guildId: "ga", key: "a", name: "A" });
        addInstallation(db, "ka", "ga", context.id);
        addInstallation(db, "kb", "ga", context.id);
        db.prepare(`INSERT INTO ContinuityPhonesV2(id,continuity_id,phone_number,is_active,created_at,updated_at)
            VALUES (11,'ka','555-0011',1,'old','old'),(12,'kb','555-0012',1,'old','old')`).run();
        db.prepare(`INSERT INTO PhoneContactsV2(id,phone_id,linked_phone_id,contact_type,display_name,phone_number,
            favorite,pinned,blocked,interaction_count,created_at,updated_at)
            VALUES (21,11,12,'greycore','Friend','555-0012',1,0,0,3,'contact-at','contact-at')`).run();
        db.prepare(`INSERT INTO PhoneConversationsV2(id,conversation_type,owner_phone_id,phone_a_id,phone_b_id,created_at,updated_at)
            VALUES (31,'private',11,11,12,'conversation-at','conversation-at')`).run();
        db.prepare(`INSERT INTO PhoneConversationParticipantsV2(id,conversation_id,phone_id,participant_type,is_admin,has_left,joined_at)
            VALUES (41,31,11,'greycore',1,0,'joined'),(42,31,12,'greycore',0,0,'joined')`).run();
        db.prepare(`INSERT INTO PhoneMessagesV2(id,conversation_id,sender_phone_id,content,message_type,created_at)
            VALUES (51,31,11,'historic sms','text','message-at')`).run();
        db.prepare(`INSERT INTO PhoneCallsV2(id,caller_phone_id,receiver_phone_id,status,created_at,updated_at)
            VALUES (61,11,12,'accepted','call-at','call-at')`).run();
        const migrate = reload("../src/v2/repositories/InstallationPhoneSchema");
        migrate(db); migrate(db);
        assert.equal(db.prepare("SELECT content FROM PhoneMessagesV2 WHERE id=51").get().content, "historic sms");
        assert.equal(db.prepare("SELECT content FROM InstallationPhoneMessagesV2 WHERE id=1000000051").get().content, "historic sms");
        assert.equal(db.prepare("SELECT COUNT(*) n FROM InstallationPhoneMessagesV2").get().n, 1);
        assert.equal(db.prepare("SELECT status FROM InstallationPhoneCallsV2 WHERE id=1000000061").get().status, "accepted");
        assert.equal(db.prepare("SELECT created_at FROM InstallationPhoneContactsV2 WHERE id=1000000021").get().created_at, "contact-at");
        assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
    } finally { isolated.cleanup(); }
});

test("3D bootstraps the representative historical copy twice without loss", () => {
    const isolated = createIsolatedDatabase({ copyExisting: true });
    try {
        const db = isolated.database;
        const snapshot = {};
        for (const table of ["ContinuityPhonesV2", "PhoneContactsV2", "PhoneConversationsV2",
            "PhoneConversationParticipantsV2", "PhoneMessagesV2", "PhoneConversationReadsV2",
            "PhoneConversationSettingsV2", "PhoneCallsV2", "PhoneCallMessagesV2", "PhoneCallHistoryV2"]) {
            if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
            snapshot[table] = db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
        }
        const runtimeTables = ["InstallationPhonesV2", "InstallationPhoneContactsV2",
            "InstallationPhoneConversationsV2", "InstallationPhoneConversationParticipantsV2",
            "InstallationPhoneMessagesV2", "InstallationPhoneConversationReadsV2",
            "InstallationPhoneConversationSettingsV2", "InstallationPhoneCallsV2",
            "InstallationPhoneCallMessagesV2", "InstallationPhoneCallHistoryV2"];
        const phoneIds = db.prepare("SELECT id,continuity_id,phone_number,created_at,updated_at FROM ContinuityPhonesV2 ORDER BY id").all();
        const callRows = db.prepare("SELECT id,status,created_at,answered_at,ended_at FROM PhoneCallsV2 ORDER BY id").all();
        const schema = reload("../src/database/schema");
        const originalLog = console.log;
        console.log = () => {};
        let runtimeSnapshot;
        try {
            schema.initializeDatabase();
            runtimeSnapshot = Object.fromEntries(runtimeTables.map(table =>
                [table, db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n]));
            schema.initializeDatabase();
        } finally { console.log = originalLog; }
        for (const [table, count] of Object.entries(snapshot)) {
            assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n, count);
        }
        for (const [table, count] of Object.entries(runtimeSnapshot)) {
            assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n, count);
        }
        assert.deepEqual(db.prepare("SELECT id,continuity_id,phone_number,created_at,updated_at FROM ContinuityPhonesV2 ORDER BY id").all(), phoneIds);
        assert.deepEqual(db.prepare("SELECT id,status,created_at,answered_at,ended_at FROM PhoneCallsV2 ORDER BY id").all(), callRows);
        assert.equal(db.prepare("SELECT COUNT(*) n FROM ContinuityPhonesV2").get().n, 35);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhoneLegacyArchiveV2
            WHERE reason='multiple-installations'`).get().n, 9);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhonesV2`).get().n,
            db.prepare("SELECT COUNT(*) n FROM CharacterGuildInstallationsV2").get().n);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhonesV2 p
            LEFT JOIN CharacterGuildInstallationsV2 i ON i.id=p.installation_id
            LEFT JOIN Contexts c ON c.id=p.context_id AND c.guild_id=p.guild_id
            WHERE i.id IS NULL OR c.id IS NULL OR p.guild_id IS NULL OR p.context_id IS NULL`).get().n, 0);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhoneContactsV2 c
            LEFT JOIN InstallationPhonesV2 p ON p.id=c.phone_id WHERE p.id IS NULL`).get().n, 0);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhoneConversationParticipantsV2 p
            LEFT JOIN InstallationPhoneConversationsV2 c ON c.id=p.conversation_id
            LEFT JOIN InstallationPhonesV2 phone ON phone.id=p.phone_id
            WHERE c.id IS NULL OR (p.phone_id IS NOT NULL AND phone.id IS NULL)`).get().n, 0);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhoneMessagesV2 m
            LEFT JOIN InstallationPhoneConversationsV2 c ON c.id=m.conversation_id
            WHERE c.id IS NULL`).get().n, 0);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhoneCallsV2 c
            LEFT JOIN InstallationPhonesV2 a ON a.id=c.caller_phone_id
            LEFT JOIN InstallationPhonesV2 b ON b.id=c.receiver_phone_id
            WHERE a.id IS NULL OR b.id IS NULL`).get().n, 0);
        assert.equal(db.prepare(`SELECT COUNT(*) n FROM InstallationPhoneContactsV2 c
            JOIN InstallationPhonesV2 p ON p.id=c.phone_id
            JOIN InstallationPhoneLegacyArchiveV2 a ON a.legacy_phone_id=p.legacy_phone_id
            WHERE a.reason='multiple-installations'`).get().n, 0);
        assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
    } finally { isolated.cleanup(); }
});
