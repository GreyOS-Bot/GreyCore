function tableExists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function initializeTables(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS InstallationEncountersV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            installation_a_id INTEGER NOT NULL,
            installation_b_id INTEGER,
            external_name TEXT,
            location TEXT,
            note TEXT,
            occurred_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            legacy_encounter_id INTEGER UNIQUE,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id),
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(installation_a_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(installation_b_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(legacy_encounter_id) REFERENCES ContinuityEncountersV2(id) ON DELETE SET NULL,
            CHECK(installation_b_id IS NULL OR installation_a_id != installation_b_id),
            CHECK((installation_b_id IS NOT NULL AND external_name IS NULL)
                OR (installation_b_id IS NULL AND LENGTH(TRIM(external_name)) > 0))
        );
        CREATE INDEX IF NOT EXISTS idx_installation_encounters_a_date
            ON InstallationEncountersV2(installation_a_id,occurred_at DESC,id DESC);
        CREATE INDEX IF NOT EXISTS idx_installation_encounters_scope
            ON InstallationEncountersV2(guild_id,context_id);
        CREATE INDEX IF NOT EXISTS idx_installation_encounters_b_context
            ON InstallationEncountersV2(installation_b_id,context_id);

        CREATE TRIGGER IF NOT EXISTS trg_installation_encounter_scope_insert
        BEFORE INSERT ON InstallationEncountersV2
        WHEN NOT EXISTS (
            SELECT 1 FROM CharacterGuildInstallationsV2 a
            JOIN Contexts c ON c.id=NEW.context_id AND c.guild_id=NEW.guild_id
            WHERE a.id=NEW.installation_a_id
              AND a.guild_id=NEW.guild_id AND a.context_id=NEW.context_id
              AND (NEW.installation_b_id IS NULL OR EXISTS (
                  SELECT 1 FROM CharacterGuildInstallationsV2 b
                  WHERE b.id=NEW.installation_b_id AND b.guild_id=NEW.guild_id
                    AND b.context_id=NEW.context_id AND b.id<>a.id
              ))
        ) BEGIN SELECT RAISE(ABORT,'Installation encounter scope mismatch'); END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_encounter_scope_immutable
        BEFORE UPDATE OF guild_id,context_id,installation_a_id,installation_b_id,legacy_encounter_id
        ON InstallationEncountersV2
        BEGIN SELECT RAISE(ABORT,'Installation encounter scope is immutable'); END;
    `);
}

function resolveInternalPair(db, continuityAId, continuityBId) {
    const rows = db.prepare(`SELECT a.id installation_a_id,b.id installation_b_id,a.guild_id,a.context_id
        FROM CharacterGuildInstallationsV2 a
        JOIN CharacterGuildInstallationsV2 b ON b.guild_id=a.guild_id AND b.context_id=a.context_id
        WHERE a.continuity_id=? AND b.continuity_id=? AND a.id<>b.id
        ORDER BY a.guild_id,a.context_id,a.id,b.id`).all(continuityAId, continuityBId);
    return rows.length === 1 ? rows[0] : null;
}

function resolveExternalOwner(db, continuityAId) {
    const rows = db.prepare(`SELECT id installation_a_id,guild_id,context_id
        FROM CharacterGuildInstallationsV2 WHERE continuity_id=? ORDER BY guild_id,context_id,id`).all(continuityAId);
    return rows.length === 1 ? rows[0] : null;
}

function migrateLegacy(db) {
    if (!tableExists(db,"Guilds") || !tableExists(db,"ContinuityEncountersV2") || !tableExists(db,"CharacterGuildInstallationsV2") || !tableExists(db,"Contexts")) return;
    const insert = db.prepare(`INSERT OR IGNORE INTO InstallationEncountersV2(
        guild_id,context_id,installation_a_id,installation_b_id,external_name,location,note,
        occurred_at,created_by,created_at,updated_at,legacy_encounter_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const row of db.prepare("SELECT * FROM ContinuityEncountersV2 ORDER BY id").all()) {
        const owner = row.continuity_b_id
            ? resolveInternalPair(db,row.continuity_a_id,row.continuity_b_id)
            : resolveExternalOwner(db,row.continuity_a_id);
        if (!owner) continue;
        insert.run(String(owner.guild_id),owner.context_id,owner.installation_a_id,
            owner.installation_b_id || null,row.continuity_b_id ? null : row.external_name,
            row.location,row.note,row.occurred_at,row.created_by,row.created_at,row.updated_at,row.id);
    }
}

module.exports = function initializeInstallationEncounterSchema(db) {
    initializeTables(db);
    db.transaction(() => migrateLegacy(db))();
};
