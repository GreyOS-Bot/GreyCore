function tableExists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function createSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS InstallationStatesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            installation_id INTEGER NOT NULL,
            state_type_id INTEGER NOT NULL,
            note TEXT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            legacy_state_id INTEGER UNIQUE,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id),
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(state_type_id) REFERENCES StateTypes(id) ON DELETE RESTRICT,
            FOREIGN KEY(legacy_state_id) REFERENCES ContinuityStatesV2(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_installation_states_installation
            ON InstallationStatesV2(installation_id);
        CREATE INDEX IF NOT EXISTS idx_installation_states_history
            ON InstallationStatesV2(installation_id, ended_at, started_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_installation_states_scope
            ON InstallationStatesV2(guild_id, context_id);
        CREATE INDEX IF NOT EXISTS idx_installation_states_type
            ON InstallationStatesV2(state_type_id);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_installation_states_active
            ON InstallationStatesV2(installation_id, state_type_id) WHERE ended_at IS NULL;

        CREATE TRIGGER IF NOT EXISTS trg_installation_state_scope_insert
        BEFORE INSERT ON InstallationStatesV2
        WHEN NOT EXISTS (
            SELECT 1 FROM CharacterGuildInstallationsV2 i
            JOIN Contexts c ON c.id=NEW.context_id AND c.guild_id=NEW.guild_id
            JOIN StateTypes st ON st.id=NEW.state_type_id AND st.guild_id=NEW.guild_id
            WHERE i.id=NEW.installation_id AND i.guild_id=NEW.guild_id AND i.context_id=NEW.context_id
        ) BEGIN SELECT RAISE(ABORT,'Installation state scope mismatch'); END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_state_scope_immutable
        BEFORE UPDATE OF guild_id,context_id,installation_id,state_type_id,legacy_state_id
        ON InstallationStatesV2
        BEGIN SELECT RAISE(ABORT,'Installation state scope is immutable'); END;
    `);
}

function migrate(db) {
    if (!["Guilds", "Contexts", "CharacterGuildInstallationsV2", "StateTypes", "ContinuityStatesV2"]
        .every(name => tableExists(db, name))) return;
    const candidates = db.prepare(`
        SELECT s.*, st.guild_id
        FROM ContinuityStatesV2 s JOIN StateTypes st ON st.id=s.state_type_id
        ORDER BY s.id
    `).all();
    const installations = db.prepare(`
        SELECT id,guild_id,context_id FROM CharacterGuildInstallationsV2
        WHERE continuity_id=? AND guild_id=? ORDER BY id
    `);
    const insert = db.prepare(`INSERT OR IGNORE INTO InstallationStatesV2
        (guild_id,context_id,installation_id,state_type_id,note,started_at,ended_at,created_by,created_at,updated_at,legacy_state_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
    for (const row of candidates) {
        const matches = installations.all(row.continuity_id, row.guild_id);
        if (matches.length !== 1 || !matches[0].context_id) continue;
        const i = matches[0];
        insert.run(String(i.guild_id), i.context_id, i.id, row.state_type_id, row.note,
            row.started_at, row.ended_at, row.created_by, row.created_at, row.updated_at, row.id);
    }
}

module.exports = function initializeInstallationStateSchema(db) {
    createSchema(db);
    db.transaction(() => migrate(db))();
};
