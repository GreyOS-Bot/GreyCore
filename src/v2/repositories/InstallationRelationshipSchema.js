function tableExists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function initializeTables(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS InstallationRelationshipsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            installation_a_id INTEGER NOT NULL,
            installation_b_id INTEGER NOT NULL,
            pair_low_installation_id INTEGER NOT NULL,
            pair_high_installation_id INTEGER NOT NULL,
            relationship_type_id INTEGER NOT NULL,
            note TEXT, started_at TEXT, ended_at TEXT,
            created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            legacy_relationship_id INTEGER UNIQUE,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id),
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(installation_a_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(installation_b_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(pair_low_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(pair_high_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(relationship_type_id) REFERENCES RelationshipTypes(id) ON DELETE RESTRICT,
            FOREIGN KEY(legacy_relationship_id) REFERENCES ContinuityRelationshipsV2(id) ON DELETE SET NULL,
            CHECK(installation_a_id != installation_b_id),
            CHECK(pair_low_installation_id < pair_high_installation_id)
        );

        CREATE TABLE IF NOT EXISTS PendingInstallationRelationshipsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            requester_installation_id INTEGER NOT NULL,
            target_installation_id INTEGER NOT NULL,
            pair_low_installation_id INTEGER NOT NULL,
            pair_high_installation_id INTEGER NOT NULL,
            relationship_type_id INTEGER NOT NULL,
            requested_by TEXT NOT NULL, target_owner_id TEXT NOT NULL,
            note TEXT, started_at TEXT,
            status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL,
            responded_at TEXT, responded_by TEXT,
            legacy_request_id INTEGER UNIQUE,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id),
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(requester_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(target_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(pair_low_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(pair_high_installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(relationship_type_id) REFERENCES RelationshipTypes(id) ON DELETE RESTRICT,
            FOREIGN KEY(legacy_request_id) REFERENCES PendingContinuityRelationshipsV2(id) ON DELETE SET NULL,
            CHECK(requester_installation_id != target_installation_id),
            CHECK(status IN ('pending','accepted','rejected'))
        );

        CREATE INDEX IF NOT EXISTS idx_installation_relationships_scope
            ON InstallationRelationshipsV2(guild_id,context_id,ended_at);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_installation_relationships_active_pair
            ON InstallationRelationshipsV2(
                context_id,relationship_type_id,
                pair_low_installation_id,pair_high_installation_id
            ) WHERE ended_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_installation_relationships_a
            ON InstallationRelationshipsV2(installation_a_id,context_id);
        CREATE INDEX IF NOT EXISTS idx_installation_relationships_b
            ON InstallationRelationshipsV2(installation_b_id,context_id);
        CREATE INDEX IF NOT EXISTS idx_pending_installation_relationships_target
            ON PendingInstallationRelationshipsV2(target_installation_id,status,context_id);
        CREATE INDEX IF NOT EXISTS idx_pending_installation_relationships_requester
            ON PendingInstallationRelationshipsV2(requester_installation_id,status,context_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_installation_relationships_active_pair
            ON PendingInstallationRelationshipsV2(
                context_id,relationship_type_id,
                pair_low_installation_id,pair_high_installation_id
            ) WHERE status='pending';

        CREATE TRIGGER IF NOT EXISTS trg_installation_relationship_scope_insert
        BEFORE INSERT ON InstallationRelationshipsV2
        WHEN NOT EXISTS (
            SELECT 1 FROM CharacterGuildInstallationsV2 a
            JOIN CharacterGuildInstallationsV2 b ON b.id=NEW.installation_b_id
            JOIN Contexts c ON c.id=NEW.context_id AND c.guild_id=NEW.guild_id
            JOIN RelationshipTypes t ON t.id=NEW.relationship_type_id AND t.guild_id=NEW.guild_id
            WHERE a.id=NEW.installation_a_id
              AND a.guild_id=NEW.guild_id AND b.guild_id=NEW.guild_id
              AND a.context_id=NEW.context_id AND b.context_id=NEW.context_id
              AND NEW.pair_low_installation_id=MIN(a.id,b.id)
              AND NEW.pair_high_installation_id=MAX(a.id,b.id)
        ) BEGIN SELECT RAISE(ABORT,'Installation relationship scope mismatch'); END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_relationship_scope_immutable
        BEFORE UPDATE OF guild_id,context_id,installation_a_id,installation_b_id,
            pair_low_installation_id,pair_high_installation_id,relationship_type_id
        ON InstallationRelationshipsV2
        BEGIN SELECT RAISE(ABORT,'Installation relationship scope is immutable'); END;

        CREATE TRIGGER IF NOT EXISTS trg_pending_installation_relationship_scope_insert
        BEFORE INSERT ON PendingInstallationRelationshipsV2
        WHEN NOT EXISTS (
            SELECT 1 FROM CharacterGuildInstallationsV2 a
            JOIN CharacterGuildInstallationsV2 b ON b.id=NEW.target_installation_id
            JOIN Contexts c ON c.id=NEW.context_id AND c.guild_id=NEW.guild_id
            JOIN RelationshipTypes t ON t.id=NEW.relationship_type_id AND t.guild_id=NEW.guild_id
            WHERE a.id=NEW.requester_installation_id
              AND a.guild_id=NEW.guild_id AND b.guild_id=NEW.guild_id
              AND a.context_id=NEW.context_id AND b.context_id=NEW.context_id
              AND NEW.pair_low_installation_id=MIN(a.id,b.id)
              AND NEW.pair_high_installation_id=MAX(a.id,b.id)
        ) BEGIN SELECT RAISE(ABORT,'Pending installation relationship scope mismatch'); END;

        CREATE TRIGGER IF NOT EXISTS trg_pending_installation_relationship_scope_immutable
        BEFORE UPDATE OF guild_id,context_id,requester_installation_id,target_installation_id,
            pair_low_installation_id,pair_high_installation_id,relationship_type_id
        ON PendingInstallationRelationshipsV2
        BEGIN SELECT RAISE(ABORT,'Pending installation relationship scope is immutable'); END;
    `);
}

function resolvePair(db, guildId, continuityAId, continuityBId) {
    const pairs = db.prepare(`SELECT a.id installation_a_id,b.id installation_b_id,a.context_id
        FROM CharacterGuildInstallationsV2 a JOIN CharacterGuildInstallationsV2 b
          ON b.guild_id=a.guild_id AND b.context_id=a.context_id
        WHERE a.guild_id=? AND a.continuity_id=? AND b.continuity_id=?
        ORDER BY a.id,b.id`).all(String(guildId), continuityAId, continuityBId);
    return pairs.length === 1 ? pairs[0] : null;
}

function migrateLegacy(db) {
    if (!tableExists(db,"ContinuityRelationshipsV2")
        || !tableExists(db,"CharacterGuildInstallationsV2")
        || !tableExists(db,"Contexts") || !tableExists(db,"RelationshipTypes")) return;
    const insertRelationship = db.prepare(`INSERT OR IGNORE INTO InstallationRelationshipsV2(
        guild_id,context_id,installation_a_id,installation_b_id,pair_low_installation_id,
        pair_high_installation_id,relationship_type_id,note,started_at,ended_at,created_by,
        created_at,updated_at,legacy_relationship_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const row of db.prepare("SELECT * FROM ContinuityRelationshipsV2 ORDER BY id").all()) {
        const pair=resolvePair(db,row.guild_id,row.continuity_a_id,row.continuity_b_id);
        if (!pair) continue;
        insertRelationship.run(String(row.guild_id),pair.context_id,pair.installation_a_id,pair.installation_b_id,
            Math.min(pair.installation_a_id,pair.installation_b_id),Math.max(pair.installation_a_id,pair.installation_b_id),
            row.relationship_type_id,row.note,row.started_at,row.ended_at,row.created_by,row.created_at,row.updated_at,row.id);
    }
    if (!tableExists(db,"PendingContinuityRelationshipsV2")) return;
    const insertRequest = db.prepare(`INSERT OR IGNORE INTO PendingInstallationRelationshipsV2(
        guild_id,context_id,requester_installation_id,target_installation_id,pair_low_installation_id,
        pair_high_installation_id,relationship_type_id,requested_by,target_owner_id,note,started_at,
        status,created_at,responded_at,responded_by,legacy_request_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const row of db.prepare(`SELECT p.*,t.guild_id FROM PendingContinuityRelationshipsV2 p
        JOIN RelationshipTypes t ON t.id=p.relationship_type_id ORDER BY p.id`).all()) {
        const pair=resolvePair(db,row.guild_id,row.requester_continuity_id,row.target_continuity_id);
        if (!pair) continue;
        insertRequest.run(String(row.guild_id),pair.context_id,pair.installation_a_id,pair.installation_b_id,
            Math.min(pair.installation_a_id,pair.installation_b_id),Math.max(pair.installation_a_id,pair.installation_b_id),
            row.relationship_type_id,row.requested_by,row.target_owner_id,row.note,row.started_at,row.status,
            row.created_at,row.responded_at,row.responded_by,row.id);
    }
}

module.exports=function initializeInstallationRelationshipSchema(db){
    initializeTables(db);
    db.transaction(()=>migrateLegacy(db))();
};
