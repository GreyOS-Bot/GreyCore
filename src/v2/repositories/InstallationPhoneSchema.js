function tableExists(db, name) {
    return Boolean(db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?"
    ).get(name));
}

function initializeTables(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS InstallationPhonesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            installation_id INTEGER NOT NULL UNIQUE,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            continuity_id TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            legacy_phone_id INTEGER,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE CASCADE,
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(continuity_id) REFERENCES CharacterContinuitiesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(legacy_phone_id) REFERENCES ContinuityPhonesV2(id) ON DELETE SET NULL,
            UNIQUE(guild_id, context_id, phone_number)
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneLegacyArchiveV2 (
            legacy_phone_id INTEGER PRIMARY KEY,
            reason TEXT NOT NULL,
            archived_at TEXT NOT NULL,
            FOREIGN KEY(legacy_phone_id) REFERENCES ContinuityPhonesV2(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneContactsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_id INTEGER NOT NULL,
            linked_phone_id INTEGER,
            contact_type TEXT NOT NULL DEFAULT 'greycore',
            display_name TEXT NOT NULL,
            phone_number TEXT,
            favorite INTEGER NOT NULL DEFAULT 0,
            pinned INTEGER NOT NULL DEFAULT 0,
            blocked INTEGER NOT NULL DEFAULT 0,
            interaction_count INTEGER NOT NULL DEFAULT 0,
            last_interaction_at TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(linked_phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneConversationsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            conversation_type TEXT NOT NULL DEFAULT 'private',
            name TEXT,
            owner_phone_id INTEGER,
            phone_a_id INTEGER,
            phone_b_id INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(owner_phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE SET NULL,
            FOREIGN KEY(phone_a_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(phone_b_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            CHECK(conversation_type IN ('private', 'group'))
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneConversationParticipantsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            phone_id INTEGER,
            external_name TEXT,
            external_phone TEXT,
            participant_type TEXT NOT NULL DEFAULT 'greycore',
            is_admin INTEGER NOT NULL DEFAULT 0,
            has_left INTEGER NOT NULL DEFAULT 0,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            FOREIGN KEY(conversation_id) REFERENCES InstallationPhoneConversationsV2(id) ON DELETE CASCADE,
            FOREIGN KEY(phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            CHECK(phone_id IS NOT NULL OR external_name IS NOT NULL OR external_phone IS NOT NULL)
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneMessagesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_phone_id INTEGER,
            external_sender_name TEXT,
            external_sender_phone TEXT,
            content TEXT NOT NULL,
            subject TEXT,
            message_type TEXT NOT NULL DEFAULT 'text',
            public_guild_id TEXT,
            public_channel_id TEXT,
            webhook_message_id TEXT,
            media_url TEXT,
            media_content_type TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES InstallationPhoneConversationsV2(id) ON DELETE CASCADE,
            FOREIGN KEY(sender_phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneConversationReadsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            phone_id INTEGER NOT NULL,
            last_read_message_id INTEGER,
            unread_count INTEGER NOT NULL DEFAULT 0,
            last_read_at TEXT,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES InstallationPhoneConversationsV2(id) ON DELETE CASCADE,
            FOREIGN KEY(phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(last_read_message_id) REFERENCES InstallationPhoneMessagesV2(id) ON DELETE SET NULL,
            UNIQUE(conversation_id, phone_id)
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneConversationSettingsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            phone_id INTEGER NOT NULL,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            is_muted INTEGER NOT NULL DEFAULT 0,
            is_hidden INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES InstallationPhoneConversationsV2(id) ON DELETE CASCADE,
            FOREIGN KEY(phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            UNIQUE(conversation_id, phone_id)
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneCallsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            caller_phone_id INTEGER NOT NULL,
            receiver_phone_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('ringing','accepted','refused','missed','cancelled','ended')),
            created_at TEXT NOT NULL,
            updated_at TEXT,
            answered_at TEXT,
            ended_at TEXT,
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(caller_phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(receiver_phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE,
            CHECK(caller_phone_id != receiver_phone_id)
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneCallMessagesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_id INTEGER NOT NULL,
            speaker_phone_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(call_id) REFERENCES InstallationPhoneCallsV2(id) ON DELETE CASCADE,
            FOREIGN KEY(speaker_phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS InstallationPhoneCallHistoryV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            caller_phone_id INTEGER,
            external_caller_name TEXT,
            external_caller_phone TEXT,
            call_type TEXT NOT NULL DEFAULT 'private',
            status TEXT NOT NULL DEFAULT 'started',
            started_at TEXT NOT NULL,
            answered_at TEXT,
            ended_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES InstallationPhoneConversationsV2(id) ON DELETE SET NULL,
            FOREIGN KEY(caller_phone_id) REFERENCES InstallationPhonesV2(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_installation_phones_scope_number
            ON InstallationPhonesV2(guild_id, context_id, phone_number);
        CREATE INDEX IF NOT EXISTS idx_installation_phones_scope_active
            ON InstallationPhonesV2(guild_id, context_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_installation_phones_continuity
            ON InstallationPhonesV2(continuity_id);
        CREATE INDEX IF NOT EXISTS idx_installation_phone_contacts_owner
            ON InstallationPhoneContactsV2(phone_id);
        CREATE INDEX IF NOT EXISTS idx_installation_phone_conversations_scope
            ON InstallationPhoneConversationsV2(guild_id, context_id, updated_at);
        CREATE INDEX IF NOT EXISTS idx_installation_phone_messages_conversation
            ON InstallationPhoneMessagesV2(conversation_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_installation_phone_calls_scope_status
            ON InstallationPhoneCallsV2(guild_id, context_id, status, created_at);
        CREATE INDEX IF NOT EXISTS idx_installation_phone_calls_caller
            ON InstallationPhoneCallsV2(caller_phone_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_installation_phone_calls_receiver
            ON InstallationPhoneCallsV2(receiver_phone_id, created_at);

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_scope_insert
        BEFORE INSERT ON InstallationPhonesV2
        WHEN NOT EXISTS (
            SELECT 1 FROM CharacterGuildInstallationsV2 i
            WHERE i.id = NEW.installation_id
              AND i.guild_id = NEW.guild_id
              AND i.context_id = NEW.context_id
              AND i.continuity_id = NEW.continuity_id
        ) OR NOT EXISTS (
            SELECT 1 FROM Contexts c
            WHERE c.id = NEW.context_id AND c.guild_id = NEW.guild_id
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_scope_immutable
        BEFORE UPDATE OF installation_id, guild_id, context_id, continuity_id
        ON InstallationPhonesV2
        WHEN NEW.installation_id IS NOT OLD.installation_id
          OR NEW.guild_id IS NOT OLD.guild_id
          OR NEW.context_id IS NOT OLD.context_id
          OR NEW.continuity_id IS NOT OLD.continuity_id
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone scope is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_contact_scope_insert
        BEFORE INSERT ON InstallationPhoneContactsV2
        WHEN NEW.linked_phone_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM InstallationPhonesV2 owner
            JOIN InstallationPhonesV2 linked ON linked.id = NEW.linked_phone_id
            WHERE owner.id = NEW.phone_id
              AND owner.guild_id = linked.guild_id
              AND owner.context_id = linked.context_id
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone contact scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_conversation_scope_insert
        BEFORE INSERT ON InstallationPhoneConversationsV2
        WHEN (NEW.owner_phone_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM InstallationPhonesV2 p WHERE p.id = NEW.owner_phone_id
                  AND p.guild_id = NEW.guild_id AND p.context_id = NEW.context_id
            )) OR (NEW.phone_a_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM InstallationPhonesV2 p WHERE p.id = NEW.phone_a_id
                  AND p.guild_id = NEW.guild_id AND p.context_id = NEW.context_id
            )) OR (NEW.phone_b_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM InstallationPhonesV2 p WHERE p.id = NEW.phone_b_id
                  AND p.guild_id = NEW.guild_id AND p.context_id = NEW.context_id
            ))
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone conversation scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_conversation_scope_immutable
        BEFORE UPDATE OF guild_id, context_id, owner_phone_id, phone_a_id, phone_b_id
        ON InstallationPhoneConversationsV2
        WHEN NEW.guild_id IS NOT OLD.guild_id OR NEW.context_id IS NOT OLD.context_id
          OR NEW.owner_phone_id IS NOT OLD.owner_phone_id
          OR NEW.phone_a_id IS NOT OLD.phone_a_id OR NEW.phone_b_id IS NOT OLD.phone_b_id
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone conversation scope is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_participant_scope_insert
        BEFORE INSERT ON InstallationPhoneConversationParticipantsV2
        WHEN NEW.phone_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM InstallationPhoneConversationsV2 c
            JOIN InstallationPhonesV2 p ON p.id = NEW.phone_id
            WHERE c.id = NEW.conversation_id
              AND c.guild_id = p.guild_id AND c.context_id = p.context_id
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone participant scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_participant_identity_immutable
        BEFORE UPDATE OF conversation_id, phone_id
        ON InstallationPhoneConversationParticipantsV2
        WHEN NEW.conversation_id IS NOT OLD.conversation_id OR NEW.phone_id IS NOT OLD.phone_id
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone participant identity is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_message_scope_insert
        BEFORE INSERT ON InstallationPhoneMessagesV2
        WHEN NEW.sender_phone_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM InstallationPhoneConversationsV2 c
            JOIN InstallationPhonesV2 p ON p.id = NEW.sender_phone_id
            JOIN InstallationPhoneConversationParticipantsV2 cp
              ON cp.conversation_id = c.id AND cp.phone_id = p.id AND cp.has_left = 0
            WHERE c.id = NEW.conversation_id
              AND c.guild_id = p.guild_id AND c.context_id = p.context_id
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone message scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_message_identity_immutable
        BEFORE UPDATE OF conversation_id, sender_phone_id ON InstallationPhoneMessagesV2
        WHEN NEW.conversation_id IS NOT OLD.conversation_id
          OR NEW.sender_phone_id IS NOT OLD.sender_phone_id
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone message identity is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_read_scope_insert
        BEFORE INSERT ON InstallationPhoneConversationReadsV2
        WHEN NOT EXISTS (
            SELECT 1 FROM InstallationPhoneConversationParticipantsV2 p
            WHERE p.conversation_id = NEW.conversation_id AND p.phone_id = NEW.phone_id
        ) OR (NEW.last_read_message_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM InstallationPhoneMessagesV2 m
            WHERE m.id = NEW.last_read_message_id AND m.conversation_id = NEW.conversation_id
        ))
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone read scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_setting_scope_insert
        BEFORE INSERT ON InstallationPhoneConversationSettingsV2
        WHEN NOT EXISTS (
            SELECT 1 FROM InstallationPhoneConversationParticipantsV2 p
            WHERE p.conversation_id = NEW.conversation_id AND p.phone_id = NEW.phone_id
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone setting scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_call_scope_insert
        BEFORE INSERT ON InstallationPhoneCallsV2
        WHEN NOT EXISTS (
            SELECT 1 FROM InstallationPhonesV2 caller
            JOIN InstallationPhonesV2 receiver ON receiver.id = NEW.receiver_phone_id
            WHERE caller.id = NEW.caller_phone_id
              AND caller.guild_id = NEW.guild_id AND caller.context_id = NEW.context_id
              AND receiver.guild_id = NEW.guild_id AND receiver.context_id = NEW.context_id
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone call scope mismatch');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_call_scope_immutable
        BEFORE UPDATE OF guild_id, context_id, caller_phone_id, receiver_phone_id
        ON InstallationPhoneCallsV2
        WHEN NEW.guild_id IS NOT OLD.guild_id OR NEW.context_id IS NOT OLD.context_id
          OR NEW.caller_phone_id IS NOT OLD.caller_phone_id
          OR NEW.receiver_phone_id IS NOT OLD.receiver_phone_id
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone call scope is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_call_message_scope_insert
        BEFORE INSERT ON InstallationPhoneCallMessagesV2
        WHEN NOT EXISTS (
            SELECT 1 FROM InstallationPhoneCallsV2 c
            WHERE c.id = NEW.call_id
              AND NEW.speaker_phone_id IN (c.caller_phone_id, c.receiver_phone_id)
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone call message participant mismatch');
        END;


        CREATE TRIGGER IF NOT EXISTS trg_installation_phone_call_message_identity_immutable
        BEFORE UPDATE OF call_id, speaker_phone_id ON InstallationPhoneCallMessagesV2
        WHEN NEW.call_id IS NOT OLD.call_id OR NEW.speaker_phone_id IS NOT OLD.speaker_phone_id
        BEGIN
            SELECT RAISE(ABORT, 'Installation Phone call message identity is immutable');
        END;
    `);

    for (const table of [
        "InstallationPhonesV2", "InstallationPhoneContactsV2",
        "InstallationPhoneConversationsV2", "InstallationPhoneConversationParticipantsV2",
        "InstallationPhoneMessagesV2", "InstallationPhoneConversationReadsV2",
        "InstallationPhoneConversationSettingsV2", "InstallationPhoneCallsV2",
        "InstallationPhoneCallMessagesV2", "InstallationPhoneCallHistoryV2"
    ]) {
        db.prepare(`INSERT INTO sqlite_sequence(name, seq)
            SELECT ?, 999999999 WHERE NOT EXISTS (
                SELECT 1 FROM sqlite_sequence WHERE name = ?
            )`).run(table, table);
    }
}

function migrateDeterministicLegacy(db) {
    const runtimeId = id => id == null ? null : 1000000000 + Number(id);
    const mappings = db.prepare(`
        SELECT legacy_phone_id, MIN(id) AS instance_phone_id,
               MIN(guild_id) AS guild_id, MIN(context_id) AS context_id,
               COUNT(*) AS instance_count
        FROM InstallationPhonesV2
        WHERE legacy_phone_id IS NOT NULL
        GROUP BY legacy_phone_id
    `).all();
    const unique = new Map(mappings.filter(row => row.instance_count === 1)
        .map(row => [row.legacy_phone_id, row]));
    const mapped = id => id == null ? null : unique.get(id);
    const sameScope = rows => rows.every(row =>
        row.guild_id === rows[0].guild_id && row.context_id === rows[0].context_id);

    const insertContact = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneContactsV2 (
        id,phone_id,linked_phone_id,contact_type,display_name,phone_number,favorite,pinned,
        blocked,interaction_count,last_interaction_at,notes,created_at,updated_at
    ) VALUES (@id,@phone_id,@linked_phone_id,@contact_type,@display_name,@phone_number,@favorite,@pinned,
        @blocked,@interaction_count,@last_interaction_at,@notes,@created_at,@updated_at)`);
    for (const contact of db.prepare("SELECT * FROM PhoneContactsV2").all()) {
        const owner = mapped(contact.phone_id);
        const linked = mapped(contact.linked_phone_id);
        if (!owner || (contact.linked_phone_id != null && (!linked || !sameScope([owner, linked])))) continue;
        insertContact.run({ ...contact, id: runtimeId(contact.id), phone_id: owner.instance_phone_id,
            linked_phone_id: linked?.instance_phone_id || null });
    }

    const conversations = db.prepare("SELECT * FROM PhoneConversationsV2").all();
    const insertConversation = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneConversationsV2 (
        id,guild_id,context_id,conversation_type,name,owner_phone_id,phone_a_id,phone_b_id,created_at,updated_at
    ) VALUES (@id,@guild_id,@context_id,@conversation_type,@name,@owner_phone_id,@phone_a_id,@phone_b_id,@created_at,@updated_at)`);
    const insertParticipant = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneConversationParticipantsV2 (
        id,conversation_id,phone_id,external_name,external_phone,participant_type,is_admin,has_left,joined_at,left_at
    ) VALUES (@id,@conversation_id,@phone_id,@external_name,@external_phone,@participant_type,@is_admin,@has_left,@joined_at,@left_at)`);
    const migratedConversations = new Map();
    for (const conversation of conversations) {
        const participants = db.prepare("SELECT * FROM PhoneConversationParticipantsV2 WHERE conversation_id = ?").all(conversation.id);
        const phoneMappings = participants.filter(row => row.phone_id != null).map(row => mapped(row.phone_id));
        for (const id of [conversation.owner_phone_id, conversation.phone_a_id, conversation.phone_b_id]) {
            if (id != null) phoneMappings.push(mapped(id));
        }
        if (!phoneMappings.length || phoneMappings.some(value => !value) || !sameScope(phoneMappings)) continue;
        const current = phoneMappings[0];
        insertConversation.run({ ...conversation, id: runtimeId(conversation.id), guild_id: current.guild_id, context_id: current.context_id,
            owner_phone_id: mapped(conversation.owner_phone_id)?.instance_phone_id || null,
            phone_a_id: mapped(conversation.phone_a_id)?.instance_phone_id || null,
            phone_b_id: mapped(conversation.phone_b_id)?.instance_phone_id || null });
        for (const participant of participants) {
            insertParticipant.run({ ...participant, id: runtimeId(participant.id), conversation_id: runtimeId(participant.conversation_id),
                phone_id: mapped(participant.phone_id)?.instance_phone_id || null });
        }
        migratedConversations.set(conversation.id, { ...current, runtime_id: runtimeId(conversation.id) });
    }

    const insertMessage = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneMessagesV2 (
        id,conversation_id,sender_phone_id,external_sender_name,external_sender_phone,content,subject,
        message_type,public_guild_id,public_channel_id,webhook_message_id,media_url,media_content_type,created_at
    ) VALUES (@id,@conversation_id,@sender_phone_id,@external_sender_name,@external_sender_phone,@content,@subject,
        @message_type,@public_guild_id,@public_channel_id,@webhook_message_id,@media_url,@media_content_type,@created_at)`);
    for (const message of db.prepare("SELECT * FROM PhoneMessagesV2").all()) {
        if (!migratedConversations.has(message.conversation_id)) continue;
        const sender = mapped(message.sender_phone_id);
        if (message.sender_phone_id != null && (!sender || !sameScope([sender, migratedConversations.get(message.conversation_id)]))) continue;
        insertMessage.run({ ...message, id: runtimeId(message.id), conversation_id: runtimeId(message.conversation_id), sender_phone_id: sender?.instance_phone_id || null,
            subject: message.subject || null, media_url: message.media_url || null,
            media_content_type: message.media_content_type || null });
    }

    const insertRead = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneConversationReadsV2 (
        id,conversation_id,phone_id,last_read_message_id,unread_count,last_read_at,updated_at
    ) VALUES (@id,@conversation_id,@phone_id,@last_read_message_id,@unread_count,@last_read_at,@updated_at)`);
    for (const read of db.prepare("SELECT * FROM PhoneConversationReadsV2").all()) {
        const phone = mapped(read.phone_id);
        if (!phone || !migratedConversations.has(read.conversation_id)) continue;
        const migratedMessage = read.last_read_message_id == null || db.prepare(
            "SELECT 1 FROM InstallationPhoneMessagesV2 WHERE id = ?"
        ).get(runtimeId(read.last_read_message_id));
        insertRead.run({ ...read, id: runtimeId(read.id), conversation_id: runtimeId(read.conversation_id), phone_id: phone.instance_phone_id,
            last_read_message_id: migratedMessage ? runtimeId(read.last_read_message_id) : null });
    }
    const insertSetting = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneConversationSettingsV2 (
        id,conversation_id,phone_id,is_favorite,is_pinned,is_muted,is_hidden,created_at,updated_at
    ) VALUES (@id,@conversation_id,@phone_id,@is_favorite,@is_pinned,@is_muted,@is_hidden,@created_at,@updated_at)`);
    for (const setting of db.prepare("SELECT * FROM PhoneConversationSettingsV2").all()) {
        const phone = mapped(setting.phone_id);
        if (!phone || !migratedConversations.has(setting.conversation_id)) continue;
        insertSetting.run({ ...setting, id: runtimeId(setting.id), conversation_id: runtimeId(setting.conversation_id), phone_id: phone.instance_phone_id });
    }

    const calls = db.prepare("SELECT * FROM PhoneCallsV2").all();
    const insertCall = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneCallsV2 (
        id,guild_id,context_id,caller_phone_id,receiver_phone_id,status,created_at,updated_at,answered_at,ended_at
    ) VALUES (@id,@guild_id,@context_id,@caller_phone_id,@receiver_phone_id,@status,@created_at,@updated_at,@answered_at,@ended_at)`);
    const migratedCalls = new Set();
    for (const call of calls) {
        const caller = mapped(call.caller_phone_id);
        const receiver = mapped(call.receiver_phone_id);
        if (!caller || !receiver || !sameScope([caller, receiver])) continue;
        insertCall.run({ ...call, id: runtimeId(call.id), guild_id: caller.guild_id, context_id: caller.context_id,
            caller_phone_id: caller.instance_phone_id, receiver_phone_id: receiver.instance_phone_id,
            updated_at: call.updated_at || call.created_at });
        migratedCalls.add(call.id);
    }
    const insertCallMessage = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneCallMessagesV2
        (id,call_id,speaker_phone_id,content,created_at) VALUES (@id,@call_id,@speaker_phone_id,@content,@created_at)`);
    for (const message of db.prepare("SELECT * FROM PhoneCallMessagesV2").all()) {
        const speaker = mapped(message.speaker_phone_id);
        if (migratedCalls.has(message.call_id) && speaker) {
            insertCallMessage.run({ ...message, id: runtimeId(message.id), call_id: runtimeId(message.call_id), speaker_phone_id: speaker.instance_phone_id });
        }
    }
    const insertHistory = db.prepare(`INSERT OR IGNORE INTO InstallationPhoneCallHistoryV2 (
        id,conversation_id,caller_phone_id,external_caller_name,external_caller_phone,call_type,status,
        started_at,answered_at,ended_at,created_at
    ) VALUES (@id,@conversation_id,@caller_phone_id,@external_caller_name,@external_caller_phone,@call_type,@status,
        @started_at,@answered_at,@ended_at,@created_at)`);
    for (const history of db.prepare("SELECT * FROM PhoneCallHistoryV2").all()) {
        const caller = mapped(history.caller_phone_id);
        const conversationScope = history.conversation_id == null
            ? null : migratedConversations.get(history.conversation_id);
        if (history.caller_phone_id != null && !caller) continue;
        if (history.conversation_id != null && !conversationScope) continue;
        if (caller && conversationScope && !sameScope([caller, conversationScope])) continue;
        insertHistory.run({ ...history, id: runtimeId(history.id),
            conversation_id: runtimeId(history.conversation_id), caller_phone_id: caller?.instance_phone_id || null });
    }
}

function backfill(db) {
    if (!tableExists(db, "ContinuityPhonesV2")) return;

    const now = new Date().toISOString();
    const migrate = db.transaction(() => {
        const installations = db.prepare(`
            SELECT i.id AS installation_id, i.guild_id, i.context_id, i.continuity_id,
                   p.phone_number, p.id AS legacy_phone_id, p.is_active, p.created_at, p.updated_at
            FROM CharacterGuildInstallationsV2 i
            JOIN ContinuityPhonesV2 p ON p.continuity_id = i.continuity_id
            WHERE i.context_id IS NOT NULL
            ORDER BY i.id
        `).all();
        const insertPhone = db.prepare(`INSERT INTO InstallationPhonesV2 (
            installation_id,guild_id,context_id,continuity_id,phone_number,legacy_phone_id,
            is_active,created_at,updated_at
        ) VALUES (@installation_id,@guild_id,@context_id,@continuity_id,@phone_number,@legacy_phone_id,
            @is_active,@created_at,@updated_at)`);
        const existingInstallation = db.prepare(
            "SELECT 1 FROM InstallationPhonesV2 WHERE installation_id = ?"
        );
        const numberCollision = db.prepare(`SELECT 1 FROM InstallationPhonesV2
            WHERE guild_id = ? AND context_id = ? AND phone_number = ?`);
        for (const installation of installations) {
            if (existingInstallation.get(installation.installation_id)) continue;
            let phoneNumber = installation.phone_number;
            if (numberCollision.get(installation.guild_id, installation.context_id, phoneNumber)) {
                phoneNumber = `${phoneNumber}-${installation.installation_id}`;
            }
            insertPhone.run({ ...installation, phone_number: phoneNumber });
        }

        db.prepare(`
            INSERT OR IGNORE INTO InstallationPhoneLegacyArchiveV2 (
                legacy_phone_id, reason, archived_at
            )
            SELECT p.id,
                   CASE
                     WHEN COUNT(i.id) = 0 THEN 'zero-installation'
                     WHEN COUNT(i.id) > 1 THEN 'multiple-installations'
                     ELSE 'migrated-single-installation'
                   END,
                   ?
            FROM ContinuityPhonesV2 p
            LEFT JOIN CharacterGuildInstallationsV2 i
              ON i.continuity_id = p.continuity_id
            GROUP BY p.id
        `).run(now);

        migrateDeterministicLegacy(db);
    });
    migrate();
}

module.exports = function initializeInstallationPhoneSchema(db) {
    initializeTables(db);
    backfill(db);
};
